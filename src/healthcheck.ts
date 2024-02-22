const bootstrap = async () => {
  try {
    const response = await fetch("http://localhost:3000/health");
    if (!response.ok) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    process.exit(1);
  }
};
bootstrap();
