const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

const corsOptions = {
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}

app.use(cors(corsOptions)) // Use this after the variable declaration

const { Client } = require('pg');
const bodyParser = require('body-parser');

// Connection string
const connectionString = 'postgresql://ShoppingDB_owner:h2gwx1cdYZDC@ep-spring-lab-a5jtrah3.us-east-2.aws.neon.tech/ShoppingDB?sslmode=require';

// Create a new client with the connection string
const client = new Client({
    connectionString: connectionString,
});
client.connect()

app.use(bodyParser.json());

app.get('/products-category', (req, res) => {
    const { category } = req.query; // Get the category from the query string

    if (!category) {
        return res.status(400).json({ error: 'Category parameter is missing' });
    }

    const queryText = `SELECT * FROM \"Product\" WHERE category = $1`;
    const values = [category];

    client.query(queryText, values)
        .then(result => res.json({ products: result.rows }))
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});


app.get('/products-all', (req, res) => {
    const queryText = `SELECT * FROM \"Product\"`;

    client.query(queryText)
        .then(result => res.json({ products: result.rows }))
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});

app.get('/products-id', (req, res) => {
    const { id } = req.query; // Get the id from the query string

    if (!id) {
        return res.status(400).json({ error: 'id parameter is missing' });
    }

    const queryText = `SELECT * FROM \"Product\" WHERE id = $1`;

    const values = [id];

    client.query(queryText, values)
        .then(result => res.json({ products: result.rows }))
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});

app.get('/user-id', (req, res) => {
    const { email } = req.query; // Get the email from the query string

    if (!email) {
        return res.status(400).json({ error: 'email parameter is missing' });
    }

    const queryText = `SELECT * FROM \"User\" WHERE email = $1`;

    const values = [email];

    client.query(queryText, values)
        .then(result => res.json({ users: result.rows }))
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});

app.post('/create-order', (req, res) => {
    console.log(req.body);
    let randomId = Math.floor(Math.random()*100000);

    let { userId, orderDate, totalPrice, products } = req.body;

    const queryText = `INSERT INTO "Order"("orderId", "userId", "orderDate", "totalPrice") VALUES('${randomId}','${userId}','${new Date().toISOString()}','${totalPrice}')`;
    console.log(queryText)

    client.query(queryText)
        .then(result => {
            products.forEach((p) => {
                const queryText1 = `INSERT INTO "OrderItem"("prodId", "orderId", "quantity") VALUES(${p.prodId}, ${randomId}, ${p.quantity})`;
                client.query(queryText1)
                    .then(result => {
                        
                    })
                    .catch(err => {
                        console.error('Error executing query', err);
                        res.status(500).json({ error: 'Error executing query' });
                    })
            })
        }).then(() => {res.status(200).json({ res: 'Success' });})
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});

app.get('/history', (req, res) => {
    const { orderId } = req.query; // Get the orderId from the query string

    if (!orderId) {
        return res.status(400).json({ error: 'orderId parameter is missing' });
    }

    const queryText = `
                    SELECT 
                        O."orderId",
                        O."orderDate",
                        O."paymentDate",
                        O."totalPrice",
                        O."deliveredDate",
                        O."isReplacable",
                        O."isDelivered",
                        OI."prodId",
                        P."name" AS "productName",
                        P."description" AS "productDescription",
                        P."price" AS "productPrice",
                        OI."quantity" AS "orderedQuantity"
                    FROM 
                        "Order" AS O
                    INNER JOIN 
                        "OrderItem" AS OI ON O."orderId" = OI."orderId"
                    INNER JOIN 
                        "Product" AS P ON OI."prodId" = P."id"
                    WHERE 
                        O."userId" = $1
                    ORDER BY 
                        O."orderId";`;

    const values = [orderId];

    client.query(queryText, values)
        .then(result => res.json({ orders: result.rows }))
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).json({ error: 'Error executing query' });
        })
});

module.exports = app;
