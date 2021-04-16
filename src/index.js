const { request, response } = require('express');
const { v4: uuidv4 } = require('uuid');
const express = require('express');

const app = express();

app.use(express.json());

const customers = [];

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0)

  return balance;
}

//Middleware
function verifyIfCustomerExists(request, response, next) {
  const { cpf } = request.headers;
  
  const customer = customers.find(custumer => custumer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({error: 'Customer not exist'});
  }

  request.customer = customer;

  return next();
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlredyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlredyExists) {
    return response.status(400).json({error: 'Customer Alredy Exists'});
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });

  return response.status(201).send();
});

//app.use(verifyIfCustomerExists); -> uma forma de usar o middleware em todas as rotas abaixo. 

app.get('/statement', verifyIfCustomerExists, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get('/statement/date', verifyIfCustomerExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00")

  const statement = customer.statement.filter((statement) => 
    statement.created_at.toDateString() === date.toDateString()
  );
})

app.post('/deposit', verifyIfCustomerExists, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    type: "credit",
    created_at: new Date()
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
})

app.post('/withdraw', verifyIfCustomerExists, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({error: "Insufficient funds!"});
  }

  const statementOperation = {
    amount,
    type: "debit",
    created_at: new Date()
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
})


app.listen(3333);

