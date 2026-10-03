import Decimal from "decimal.js";

// Configure Decimal for exact financial precision (20 significant digits, half-up rounding)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Money | Decimal | string | number | null | undefined;

export class Money {
  public value: Decimal;

  constructor(amount: MoneyInput) {
    if (amount instanceof Money) {
      this.value = amount.value;
    } else if (amount instanceof Decimal) {
      this.value = amount;
    } else if (typeof amount === "string" || typeof amount === "number") {
      try {
        if (typeof amount === "number") {
          this.value = isNaN(amount) ? new Decimal(0) : new Decimal(amount);
        } else {
          // Clean Indian currency strings: "₹ 5,000.50", "Rs. 10,000/-", "INR 1,00,000", "-₹500"
          let cleaned = amount.trim();
          const isNegative = cleaned.startsWith("-") || cleaned.includes("(") && cleaned.includes(")");
          
          // Remove currency symbols, codes, commas, and suffixes
          cleaned = cleaned
            .replace(/[₹\(\)]/g, "")
            .replace(/\b(inr)\b/gi, "")
            .replace(/rs\.?/gi, "")
            .replace(/\/-\s*$/g, "")
            .replace(/,/g, "")
            .replace(/\s+/g, "")
            .trim();

          if (!cleaned || cleaned === "-" || isNaN(Number(cleaned))) {
            this.value = new Decimal(0);
          } else {
            const dec = new Decimal(cleaned);
            this.value = isNegative && !dec.isNegative() ? dec.negated() : dec;
          }
        }
      } catch {
        this.value = new Decimal(0);
      }
    } else {
      this.value = new Decimal(0);
    }
  }

  static from(amount: MoneyInput): Money {
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: MoneyInput): Money {
    return new Money(this.value.plus(new Money(other).value));
  }

  sub(other: MoneyInput): Money {
    return new Money(this.value.minus(new Money(other).value));
  }

  mul(factor: number | string | Decimal): Money {
    return new Money(this.value.times(new Decimal(factor)));
  }

  div(divisor: number | string | Decimal): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) return new Money(0);
    return new Money(this.value.dividedBy(d));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  equals(other: MoneyInput): boolean {
    return this.value.equals(new Money(other).value);
  }

  greaterThan(other: MoneyInput): boolean {
    return this.value.greaterThan(new Money(other).value);
  }

  lessThan(other: MoneyInput): boolean {
    return this.value.lessThan(new Money(other).value);
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  toFixed(dp: number = 2): string {
    return this.value.toFixed(dp);
  }

  toDecimal(): Decimal {
    return this.value;
  }

  /**
   * Format according to Indian Numbering System (e.g. ₹1,00,000 or -₹1,000 or ₹12,34,567.89)
   */
  formatIndian(includeSymbol: boolean = true, showDecimals: boolean = false): string {
    const isNeg = this.value.isNegative();
    const absVal = this.value.abs().toFixed(2);
    const [intPart, decPart] = absVal.split(".");

    let formattedInt = "";
    if (intPart.length <= 3) {
      formattedInt = intPart;
    } else {
      const lastThree = intPart.substring(intPart.length - 3);
      const remaining = intPart.substring(0, intPart.length - 3);
      const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      formattedInt = `${withCommas},${lastThree}`;
    }

    const decFormatted = showDecimals || decPart !== "00" ? `.${decPart}` : "";
    const numberStr = `${formattedInt}${decFormatted}`;

    if (!includeSymbol) {
      return `${isNeg ? "-" : ""}${numberStr}`;
    }

    return `${isNeg ? "-" : ""}₹${numberStr}`;
  }
}

/**
 * Calculate Exclusive GST:
 * Total = Base + (Base * Rate / 100)
 */
export function calculateGst(baseAmount: MoneyInput, ratePercentage: number | string | Decimal): Money {
  const base = Money.from(baseAmount);
  const rate = new Decimal(ratePercentage).dividedBy(100);
  return base.mul(rate);
}

/**
 * Calculate Inclusive GST:
 * Total includes GST.
 * Base = Total / (1 + Rate / 100)
 * GST = Total - Base
 */
export function calculateGstInclusive(totalAmount: MoneyInput, ratePercentage: number | string | Decimal): { base: Money; gst: Money } {
  const total = Money.from(totalAmount);
  const rateDec = new Decimal(ratePercentage).dividedBy(100);
  const factor = new Decimal(1).plus(rateDec);
  if (factor.isZero()) {
    return { base: total, gst: Money.zero() };
  }
  const base = total.div(factor);
  const gst = total.sub(base);
  return { base, gst };
}

/**
 * Calculate Net Profit = Inflows - Outflows
 */
export function calculateNetProfit(totalInflow: MoneyInput, totalOutflow: MoneyInput): Money {
  return Money.from(totalInflow).sub(totalOutflow);
}
