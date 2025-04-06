const express = require('express')
const path = require('path')
const app = express()
const port = 3000

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));


app.get('/',(req, res) => {
    res.render('front-page');
});

app.get('/loginpage', (req,res) => {
    res.render('search')
})

app.get('/accounts', (req,res) => {
    res.render('search')
})

app.get('/portofolios', (req,res) => {
    res.render('search')
})

app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})
