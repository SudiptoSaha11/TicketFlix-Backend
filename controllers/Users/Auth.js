const { sendVerificationEmail, senWelcomeEmail } = require ("../../middleware/Email.js");
const generateTokenAndSetCookies  = require ( "../../middleware/GenerateToken.js");
const Usermodel = require ("../../models/user.js");
const bcryptjs = require ('bcryptjs');
const jwt = require('jsonwebtoken');


const Register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const ExistsUser = await Usermodel.findOne({ email });
    if (ExistsUser) {
      return res.status(400).json({ success: false, message: "User Already Exists. Please Login." });
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    
    // ✅ Generate 4-digit OTP
    const verificationToken = Math.floor(1000 + Math.random() * 9000).toString();

    const user = new Usermodel({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await user.save();
    generateTokenAndSetCookies(res, user._id);
    await sendVerificationEmail(user.email, verificationToken);

    return res.status(200).json({ success: true, message: "User Registered Successfully", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const VerifyEmail=async(req,res)=>{
  try {
      const {code}=req.body 
      const user= await Usermodel.findOne({
          verificationToken:code,
          verificationTokenExpiresAt:{$gt:Date.now()}
      })
      if (!user) {
          return res.status(400).json({success:false,message:"Inavlid or Expired Code"})
              
          }
        
   user.isVerified=true;
   user.verificationToken=undefined;
   user.verificationTokenExpiresAt=undefined;
   await user.save()
   await senWelcomeEmail(user.email,user.name)
   return res.status(200).json({success:true,message:"Email Verifed Successfully"})
         
  } catch (error) {
      console.log(error)
      return res.status(400).json({success:false,message:"internal server error"})
  }
}

const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
  
      // Check if user exists
      const user = await Usermodel.findOne({ email });
      if (!user) {
        // User not found
        return res.status(404).json({ message: "User not found" });
      }
  
      // Compare passwords
      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) {
        // Password does not match
        return res.status(400).json({ message: "Invalid credentials" });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1h' }
      );
  
      // Respond with token
      return res.status(200).json({
        message: "Login successful",
        token,                   // <— the JWT
        user: {                  // <— just the fields the client needs
          _id:   user._id,
          name:  user.name,
          email: user.email
        }
      }); //token
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };

  const resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email is provided
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Find the user
        const user = await Usermodel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "User is already verified" });
        }

        // Generate new OTP
        const newToken = Math.floor(1000 + Math.random() * 9000).toString();
        user.verificationToken = newToken;  // Save the generated OTP here
        user.verificationTokenExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
        await user.save(); // Save the OTP in the database

        // Send new verification email with the OTP
        await sendVerificationEmail(user.email, newToken);

        return res.status(200).json({ success: true, message: "Verification code resent successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').exec();
    // map to plain objects with getters (e.g. id)
    return res.json({ users: users.map(u => u.toObject({ getters: true })) });
  } catch (err) {
    console.error('Fetching users failed:', err);
    const errorMessage = 'Fetching users failed, please try again later.';
    return res.status(500).json({ message: errorMessage });
  }
};


  


module.exports = {Register, VerifyEmail, login, resendVerificationCode, getUsers} ;