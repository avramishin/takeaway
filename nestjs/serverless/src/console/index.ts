import { Command } from 'commander';
import { createTables } from './commands/create-tables';

const program = new Command();

program.option('-create-tables', 'create tables in dynamodb', createTables);
program.parse(process.argv);
