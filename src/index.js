const app = require('./app');

server = app.listen(3000, () => {
  console.log('Running on 3000')
});

