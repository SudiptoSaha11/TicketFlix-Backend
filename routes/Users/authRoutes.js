const express = require('express');
const { Register, VerifyEmail, login, resendVerificationCode, getUsers } = require('../../controllers/Users/Auth');


const AuthRoutes=express.Router()

AuthRoutes.post('/register',Register)
AuthRoutes.post('/verifyEmail',VerifyEmail)
AuthRoutes.post('/resendVerificationCode', resendVerificationCode)
AuthRoutes.post('/login', login);
AuthRoutes.get('/users', getUsers);

module.exports = AuthRoutes;