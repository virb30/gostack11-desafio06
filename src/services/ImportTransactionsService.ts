import { getCustomRepository, getRepository, In } from 'typeorm';
import parse from 'csv-parse';
import path from 'path';
import fs from 'fs';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filePath: string;
}

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvPath = path.join(uploadConfig.directory, filePath);
    const transactionsReadStream = fs.createReadStream(csvPath);
    const parser = parse({ delimiter: ',', from_line: 2 });

    const parsed = transactionsReadStream.pipe(parser);

    const importedTransactions: TransactionDTO[] = [];
    const importedCategories: string[] = [];

    parsed.on('data', async line => {
      const [title, type, value, category] = line.map(
        (cell: string): string => {
          return cell.trim();
        },
      );

      if (!title || !type || !value) return;

      importedCategories.push(category);
      importedTransactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parsed.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(importedCategories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = importedCategories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const transactions = transactionsRepository.create(
      importedTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    await fs.promises.unlink(csvPath);

    return transactions;
  }
}

export default ImportTransactionsService;
