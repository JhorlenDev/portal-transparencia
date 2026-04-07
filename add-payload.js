const mysql = require('mysql2/promise');

async function addPayloadColumns() {
  const connection = await mysql.createConnection({
    host: '177.136.234.91',
    user: 'marreiradigital_transparencia',
    password: 'mMsh8u3bXE06KOyI',
    database: 'marreiradigital_transparencia'
  });

  const tables = [
    'despesas',
    'receitas', 
    'licitacoes',
    'contratos',
    'servidores',
    'convenios',
    'orgaos',
    'solicitacoes_sic',
    'datasets',
    'configuracao_site',
    'anexos'
  ];

  for (const table of tables) {
    try {
      await connection.query(`ALTER TABLE ${table} ADD COLUMN payload JSON`);
      console.log(`Added payload to ${table}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`payload already exists in ${table}`);
      } else {
        console.error(`Error on ${table}:`, err.message);
      }
    }
  }

  await connection.end();
  console.log('Done!');
}

addPayloadColumns();