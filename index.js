
require("./database/database").connect()
require('dotenv').config();
const {User,Question,Answer} = require('./models/user')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser")
const auth = require('./middleware/auth')
const app = express()
app.set('view engine', 'ejs');
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.static('./public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser())
app.get("/", (req, res) => {
    res.redirect('login')
})
app.get("/login", (req, res) => {
    res.render("login")
}
)
app.get("/register", (req, res) => {
    res.render("register")
}
)
app.post("/register", async (req, res) => {
    try {
        // Get all data from body
        const { username, email, password } = req.body;

        // All the data should exist
        if (!(username && email && password)) {
            // return res.status(400).send('All fields are compulsory');
            return res.status(400).json({
                success: false,
                msg: "All fields are compulsory"
            })
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // return res.status(400).send('User already exists');
            return res.status(400).json({
                success: false,
                msg: "User already exists"
            })

        }

        // Encrypt the password
        const myEncPassword = await bcrypt.hash(password, 10);

        // Save the user in db
        const user = await User.create({ username, email, password: myEncPassword });

        // Generate a token for user and send it
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                username:user.username
            },
            "shhhhh",
            {
                expiresIn: "2h"
            }
        );
        user.token = token;
        user.password = undefined;
        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };
        res.cookie('token', token, options);

        res.status(201).json({
            success: true,
            redirect: "dashboard"
        });
    } catch (error) {
        console.log(error);
        // return res.status(500).send('An error occurred');
        return res.status(500).json({
            success: false,
            msg: "An error occurred"
        })

    }
});
app.post('/login', async (req, res) => {
    try {
        // Get email and password from the request body
        const { email, password } = req.body;

        // Validate presence of email and password
        if (!email || !password) {
            return res.status(400).json({ success: false, msg: "Both email and password are required" });
        }

        // Find user in database
        const user = await User.findOne({ email });

        // If user does not exist
        if (!user) {
            return res.status(400).json({ success: false, msg: "User does not exist" });
        }

        // Verify password
        if (user && await bcrypt.compare(password, user.password)) {
            // Generate JWT token
            const token = jwt.sign(
                { id: user._id, email: user.email,username:user.username },
                "shhhhh",
                { expiresIn: "2h" }
            );

            // Set token in cookie
            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true
            };
            res.cookie('token', token, options);

            // Respond with success and redirect URL
            return res.status(200).json({ success: true, redirect: "/dashboard" });
        } else {
            return res.status(400).json({ success: false, msg: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, msg: "An error occurred" });
    }
});



// app.get('/dashboard', auth, async (req, res) => {
    
//     const searchQuery = req.query.q || ''; 
//     let questions = [];
//     let isSearch = false;

//     if (searchQuery) {
//         questions = await Question.find({
//             $or: [
//                 { title: { $regex: searchQuery, $options: 'i' } },
//                 { description: { $regex: searchQuery, $options: 'i' } }
//             ]
//         }).sort({ datePosted: -1 }).populate('postedBy', 'username');
//         isSearch = true;
//     } else {
//         questions = await Question.find().sort({ datePosted: -1 }).populate('postedBy', 'username');
//     }

//     res.render('dashboard', {  questions, searchQuery, isSearch });
// });
app.get('/dashboard', auth, async (req, res) => {
    const searchQuery = req.query.q || '';
    if (searchQuery) {
        return res.redirect(`/search?q=${searchQuery}`);
    }
    const questions = await Question.find().sort({ datePosted: -1 }).populate('postedBy', 'username');
    res.render('dashboard', { questions, searchQuery: '', isSearch: false });
});
app.get('/search', auth, async (req, res) => {
    const searchQuery = req.query.q || '';
    const questions = await Question.find({
        $or: [
            { title: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } }
        ]
    }).sort({ datePosted: -1 }).populate('postedBy', 'username');
    
    res.render('searchResults', { questions, searchQuery });
});

// Render settings page
app.get('/settings', auth, (req, res) => {
    res.render('settings', { user: req.user });
});

// Handle settings update
app.post('/settings', auth, async (req, res) => {
    
    try {
        const { username, currentPassword, newPassword } = req.body;

        // Find the user in the database
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        // Check if current password is correct
        if (!user.password) {
            return res.status(400).json({ success: false, msg: 'Password not set for this user' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, msg: 'Current password is incorrect' });
        }

        // Update username and password if provided
        if (username) user.username = username;
        if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

        // Save the updated user
        await user.save();

        res.status(200).json({ success: true, msg: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'An error occurred' });
    }
});
// questions

app.get('/question',auth,(req,res) => {
  res.render('question')
}
)
app.post('/question',auth, async (req,res) => {
    try {const userId= req.user.id;
    const {title,description}=req.body;
    const newQuestion = new Question({
        title,description,postedBy:userId
    });
await newQuestion.save();
res.redirect('/dashboard')

    }
catch(error){

console.log(error)

}
  
}
)
// Route to submit an answer to a question
app.post('/answer', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId, answerText } = req.body;
        
        const newAnswer = new Answer({
            answerText,
            question: questionId,
            postedBy: userId
        });

        await newAnswer.save();
        res.redirect(`/${questionId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
app.get('/profile', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        // Fetch user's questions and answers
        const questions = await Question.find({ postedBy: userId }).sort({ datePosted: -1 });
        const answers = await Answer.find({ postedBy: userId }).populate('question').sort({ datePosted: -1 });

        res.render('profile', { user, questions, answers });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/profile/:userId', auth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        // Fetch user's questions and answers
        const questions = await Question.find({ postedBy: userId }).sort({ datePosted: -1 });
        const answers = await Answer.find({ postedBy: userId }).populate('question').sort({ datePosted: -1 });

        res.render('othersprofile', { user, questions, answers });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});





app.get('/:questionId',async (req,res) => {
    try{
const questionId = req.params.questionId;
const question= await Question.findById(questionId).populate('postedBy', 'username');
const answers = await Answer.find({ question: questionId }).populate('postedBy', 'username');
res.render('details',{question,answers})}
catch(error){
console.log(error)
}

  }
  )



// Endpoint to clear token and logout
app.post('/logout', (req, res) => {
    // Clear cookie with token
    res.clearCookie('token');
    res.status(200).send('Logged out successfully');
});
app.use('/',(req,res) => {
    res.render('404');
} )


const PORT = 4000
app.listen(PORT, () => {
    console.log(`SERVER is running at port: ${PORT}`);
})

