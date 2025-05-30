const asyncHandler = async (reqestHandler) => {
  (req, res, next) => {
    Promise.resolve(reqestHandler(req, res, next)).catch((err) => next());
  };
};

export { asyncHandler };
