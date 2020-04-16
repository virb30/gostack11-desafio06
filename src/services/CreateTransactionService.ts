import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('Invalid type');
    }

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Cannot save transaction, insuficient credits');
    }

    const categoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    let categoryId = categoryExists?.id;

    if (!categoryExists) {
      const createdCategory = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(createdCategory);

      categoryId = createdCategory.id;
    }

    const transaction = transactionsRepository.create({
      category_id: categoryId,
      value,
      title,
      type,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
