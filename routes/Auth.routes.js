const express = require('express');
const { Register, VerifyEmail, login, resendVerificationCode } = require('../controllers/Auth');


const AuthRoutes=express.Router()

AuthRoutes.post('/register',Register)
AuthRoutes.post('/verifyEmail',VerifyEmail)
AuthRoutes.post('/resendVerificationCode', resendVerificationCode)
AuthRoutes.post('/login', login);

module.exports = AuthRoutes;