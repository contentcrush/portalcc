import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'admin123'; // Senha do administrador
  const saltRounds = 10;
  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Hash gerado para admin123:', hashedPassword);
  } catch (error) {
    console.error('Erro ao gerar hash:', error);
  }
}

generateHash();