import parse from 'csv-parse';
import path from 'path';
import fs from 'fs';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  fileName: string;
}

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const importedTransactions: TransactionDTO[] = [];
    const transactions: Transaction[] = [];
    const createTransaction = new CreateTransactionService();

    const csvPath = path.join(uploadConfig.directory, fileName);

    const parser = parse({ delimiter: ',', from_line: 2, trim: true });

    const parsed = fs.createReadStream(csvPath).pipe(parser);

    parsed.on('data', async line => {
      const [title, type, value, category] = line;

      importedTransactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parsed.on('end', resolve));

    // eslint-disable-next-line no-restricted-syntax
    for (const item of importedTransactions) {
      const { title, type, value, category } = item;

      // eslint-disable-next-line no-await-in-loop
      const transactionDB = await createTransaction.execute({
        title,
        type,
        value,
        category,
      });

      transactions.push(transactionDB);
    }

    await fs.promises.unlink(csvPath);

    return transactions;
  }
}

export default ImportTransactionsService;
