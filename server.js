const Express = require("express")
const App = Express()
const Mongoose = require("mongoose")
const bodyParser = require('body-parser')
const Cors = require("cors")

App.use(Express.urlencoded())
App.use(Cors())
App.use(Express.json())
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const PUBLISHABLE_KEY = "pk_test_51PBcHOSHekcWlW0r1tDBchWcz3LbE7A5BsBqd4LfCEt0x1vmhuDDPie5t3NfnDnZXirHgJLdXm75Du5oSnT3IIxu006wwsj0OO"
const SECRET_KEY = "sk_test_51PBcHOSHekcWlW0rf46yCMHOhMFVekHtPxBJXimRu1FYZvBHHCVwvYzoui1IYCHFcjhKHpr9l2o0zQ6QmJKGFkbo00h3AheUjg"
const stripe = require("stripe")(SECRET_KEY)
const SERVER_DOMAIN = 'http://localhost:9000'
// Mongoose.connect("mongodb+srv://user:user@cluster0.p5mydsy.mongodb.net/products?retryWrites=true&w=majority&appName=Cluster0")
const mongoose = require('mongoose');

// App.use(bodyParser.json());
// Connection URI
const uri = "mongodb+srv://user:user@cluster0.p5mydsy.mongodb.net/products?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB Atlas
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(error => console.error('Error connecting to MongoDB Atlas', error));

const ProductSchema = new Mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
})

const userSchema = new Mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})
const ProductModel = Mongoose.model("cartproducts", ProductSchema)
const users = Mongoose.model("users", userSchema)
App.post("/signup", async function (req, res) {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const userData = new users({
            email: req.body.email,
            password: hashedPassword
        })
        await userData.save()
        res.status(201).send('user registered successfully')
    } catch (error) {
        res.status(500).send('user is not registered successfully')
    }
})
App.post('/signin', async (req, res) => {
    try {
        const user = await users.findOne({ email: req.body.email })
        if (!user) {
            return res.status(404).send("User not found")
        }
        const passwordMatch = await bcrypt.compare(req.body.password, user.password)
        if (!passwordMatch) {
            return res.status(401).send("Invalid password")
        }
        const token = jwt.sign({ userID: user._id }, 'My Secret Key')
        res.status(200).json({ token })
    } catch (error) {
        res.status(500).send("Error in signin")
    }
})
App.get('/protected', (req, res) => {
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, 'My Secret key', (err, decoded) => {
        if (err) {
            return res.status(401).send("Invalid Token")
        }
        const userID = decoded.userID
        res.status(200).send("Protected route accessed")
    })
})
App.post("/cartProducts", function (req, res) {
    const productData = new ProductModel({
        id: req.body.id,
        title: req.body.title,
        image: req.body.image,
        price: req.body.price,
        quantity: req.body.quantity || 1 // Default to quantity 1 if not provided

    })
    console.log(productData)
    productData.save().then(function (output) {
        res.status(201).send('Product is successfully added to cart!')
    }).catch(function (error) {
        res.send('Product is not added to cart!Please try again.')
    })
})
App.get('/cartProducts', async (req, res) => {
    try {
        const products = await ProductModel.find();
        res.json(products);
        console.log(products)
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
App.put("/cartProducts", async function (req, res) {

    // Assuming you have defined your ProductModel schema and imported it
    console.log(req.body)
    // Your existing code for defining productData
    const productData = new ProductModel({
        id: req.body.id,
        title: req.body.title,
        image: req.body.image,
        price: req.body.price,
        quantity: req.body.quantity // Default to quantity 1 if not provided
    });

    await ProductModel.findOneAndUpdate(
        { id: productData.id },
        { $set: { quantity: productData.quantity, price: productData.price } },

        { new: true } // To return the updated document
    ).then(updatedProduct => {

        if (updatedProduct) {
            // If the product was found and updated
            res.status(200).json(updatedProduct);
        } else {
            // If the product with the given id was not found
            res.status(404).json({ message: 'Product not found' });
        }
    })
        .catch(error => {
            // Handle error
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        });

});
App.delete('/delete/:id', async function (req, res) {
    const productId = parseInt(req.params.id)
    console.log(req.params.id)
    ProductModel.deleteOne({ id: productId })
        .then(item => {
            if (item) {
                res.status(200).json({ message: 'Document deleted successfully' })
            } else {
                res.status(404).json({ message: 'document not found' })
            }
        })
        .catch(error => {
            console.error('error in delete method', error)
        })
})
const publishKey = {
    publish: PUBLISHABLE_KEY
}
App.post("/api/create-checkout-session", async function (req, res) {
    const { products } = req.body;
   
    const lineItems = products.map((product) => ({
        price_data: {
            currency: "INR",
            product_data: {
                name: product.title,
                images: [product.image]
            },
            unit_amount: Math.round(product.price * 100)
           
        },
        quantity: product.quantity
    }))
   
   const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `http://localhost:3000/success`,
        cancel_url: `http://localhost:3000/cancel`
    })
    res.json({ id: session.id }) 
 
})
App.listen(9000, function () {
    console.log("server is running on port 9000")
})
