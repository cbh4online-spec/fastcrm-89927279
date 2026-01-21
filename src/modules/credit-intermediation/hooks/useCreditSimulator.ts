import { useState, useMemo, useCallback } from "react";
import { useBankPartners } from "./useBankPartners";
import { CreditType, CreditSimulation, SimulationBankResult, BankTerms } from "../types";

interface SimulationInput {
  credit_type: CreditType;
  amount: number;
  term_months: number;
  property_value?: number;
  down_payment?: number;
}

interface SimulationResult {
  simulation: CreditSimulation | null;
  bankComparisons: SimulationBankResult[];
  bestRate: SimulationBankResult | null;
  lowestPayment: SimulationBankResult | null;
}

export function useCreditSimulator() {
  const { data: banks = [] } = useBankPartners();
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate monthly payment using French amortization system
  const calculateMonthlyPayment = useCallback(
    (principal: number, annualRate: number, termMonths: number): number => {
      if (annualRate === 0) {
        return principal / termMonths;
      }
      const monthlyRate = annualRate / 100 / 12;
      const payment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      return Math.round(payment * 100) / 100;
    },
    []
  );

  // Calculate TAEG (simplified - real calculation is more complex)
  const calculateTAEG = useCallback(
    (principal: number, totalAmount: number, termMonths: number): number => {
      const totalInterest = totalAmount - principal;
      const avgAnnualInterest = (totalInterest / (termMonths / 12)) / principal;
      return Math.round(avgAnnualInterest * 100 * 100) / 100;
    },
    []
  );

  // Run simulation
  const simulate = useCallback(
    (input: SimulationInput): SimulationResult => {
      setIsCalculating(true);

      try {
        const activeBanks = banks.filter(
          (b) => b.is_active && b.credit_types.includes(input.credit_type)
        );

        // Get bank comparisons
        const bankComparisons: SimulationBankResult[] = activeBanks
          .map((bank) => {
            const terms = bank.terms.find(
              (t) => t.credit_type === input.credit_type
            ) as BankTerms | undefined;

            if (!terms) return null;

            // Check if amount and term are within bank limits
            if (
              input.amount < terms.min_amount ||
              input.amount > terms.max_amount ||
              input.term_months < terms.min_term_months ||
              input.term_months > terms.max_term_months
            ) {
              return null;
            }

            // Check LTV for habitacao
            if (input.credit_type === "habitacao" && input.property_value) {
              const ltv = (input.amount / input.property_value) * 100;
              if (terms.max_ltv && ltv > terms.max_ltv) {
                return null;
              }
            }

            // Use average rate for simulation (in reality would be personalized)
            const estimatedRate = (terms.min_rate + terms.max_rate) / 2;
            const monthlyPayment = calculateMonthlyPayment(
              input.amount,
              estimatedRate,
              input.term_months
            );
            const totalAmount = monthlyPayment * input.term_months;
            const taeg = calculateTAEG(input.amount, totalAmount, input.term_months);

            // Estimate approval chance based on various factors
            const approvalChance = Math.min(
              95,
              70 + Math.random() * 20 + (bank.avg_approval_rate || 0) / 10
            );

            return {
              bank_id: bank.id,
              bank_name: bank.name,
              rate: estimatedRate,
              monthly_payment: monthlyPayment,
              total_amount: totalAmount,
              taeg,
              is_best_rate: false,
              is_lowest_payment: false,
              estimated_approval_chance: Math.round(approvalChance),
            };
          })
          .filter((r): r is SimulationBankResult => r !== null)
          .sort((a, b) => a.rate - b.rate);

        // Mark best rate and lowest payment
        if (bankComparisons.length > 0) {
          const bestRateBank = bankComparisons.reduce((min, b) =>
            b.rate < min.rate ? b : min
          );
          const lowestPaymentBank = bankComparisons.reduce((min, b) =>
            b.monthly_payment < min.monthly_payment ? b : min
          );

          bankComparisons.forEach((b) => {
            b.is_best_rate = b.bank_id === bestRateBank.bank_id;
            b.is_lowest_payment = b.bank_id === lowestPaymentBank.bank_id;
          });
        }

        // Create base simulation (using first bank or default rate)
        const defaultRate = bankComparisons[0]?.rate || 3.5;
        const monthlyPayment = calculateMonthlyPayment(
          input.amount,
          defaultRate,
          input.term_months
        );
        const totalAmount = monthlyPayment * input.term_months;
        const totalInterest = totalAmount - input.amount;
        const taeg = calculateTAEG(input.amount, totalAmount, input.term_months);
        const ltv = input.property_value
          ? (input.amount / input.property_value) * 100
          : undefined;

        const simulation: CreditSimulation = {
          id: crypto.randomUUID(),
          workspace_id: "",
          credit_type: input.credit_type,
          amount: input.amount,
          term_months: input.term_months,
          interest_rate: defaultRate,
          property_value: input.property_value,
          down_payment: input.down_payment,
          monthly_payment: monthlyPayment,
          total_interest: totalInterest,
          total_amount: totalAmount,
          taeg,
          ltv,
          bank_comparisons: bankComparisons,
          created_at: new Date().toISOString(),
        };

        return {
          simulation,
          bankComparisons,
          bestRate: bankComparisons.find((b) => b.is_best_rate) || null,
          lowestPayment: bankComparisons.find((b) => b.is_lowest_payment) || null,
        };
      } finally {
        setIsCalculating(false);
      }
    },
    [banks, calculateMonthlyPayment, calculateTAEG]
  );

  // Quick calculation without bank comparison
  const quickCalculate = useCallback(
    (
      amount: number,
      termMonths: number,
      annualRate: number
    ): { monthlyPayment: number; totalInterest: number; totalAmount: number } => {
      const monthlyPayment = calculateMonthlyPayment(amount, annualRate, termMonths);
      const totalAmount = monthlyPayment * termMonths;
      const totalInterest = totalAmount - amount;

      return {
        monthlyPayment,
        totalInterest,
        totalAmount,
      };
    },
    [calculateMonthlyPayment]
  );

  // Generate amortization table
  const generateAmortizationTable = useCallback(
    (
      amount: number,
      termMonths: number,
      annualRate: number
    ): Array<{
      month: number;
      payment: number;
      principal: number;
      interest: number;
      balance: number;
    }> => {
      const monthlyPayment = calculateMonthlyPayment(amount, annualRate, termMonths);
      const monthlyRate = annualRate / 100 / 12;
      let balance = amount;
      const table = [];

      for (let month = 1; month <= termMonths; month++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);

        table.push({
          month,
          payment: Math.round(monthlyPayment * 100) / 100,
          principal: Math.round(principal * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        });
      }

      return table;
    },
    [calculateMonthlyPayment]
  );

  return {
    simulate,
    quickCalculate,
    generateAmortizationTable,
    isCalculating,
    hasBanks: banks.length > 0,
  };
}
