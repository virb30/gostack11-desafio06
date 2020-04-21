import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const incomeTransactions = await this.find({ where: { type: 'income' } });

    const income = incomeTransactions.reduce(
      (total, transaction) => total + Number(transaction.value),
      0.0,
    );

    const outcomeTransactions = await this.find({ where: { type: 'outcome' } });

    const outcome = outcomeTransactions.reduce(
      (total, transaction) => total + Number(transaction.value),
      0.0,
    );

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
