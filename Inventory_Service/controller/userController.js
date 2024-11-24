const addUser = (req,res,next) => {
    const { name, email, password } = req.body;
    // Add user to the database
    
    res.status(201).json({ message: 'User created successfully' });
}