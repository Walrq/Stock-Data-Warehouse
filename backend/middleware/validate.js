const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        res.status(400);
        return next(new Error(`Validation error: ${errorMessage}`));
    }
    next();
};

module.exports = validate;
