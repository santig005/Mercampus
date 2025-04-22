import { connectDB } from "@/utils/connectDB";
import { User } from "@/utils/models/userSchema";
import mongoose from 'mongoose';
import { Seller } from '@/utils/models/sellerSchema2'; // Ajusta la ruta según tu proyecto

// Función para migrar los datos
async function populateSellerIdInUsers() {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('Conexión a la base de datos establecida');

    // Obtener todos los documentos Seller
    const sellers = await Seller.find({});

    // Iterar sobre cada Seller y actualizar el User correspondiente
    for (const seller of sellers) {
      const user = await User.findById(seller.userId);
      if (user) {
        user.sellerId = seller._id;
        await user.save();
        console.log(`Usuario ${user.email} actualizado con sellerId: ${seller._id}`);
      } else {
        console.log(`No se encontró usuario para el seller ${seller._id}`);
      }
    }

    console.log('Migración completada con éxito');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    mongoose.connection.close();
    console.log('Conexión a la base de datos cerrada');
  }
}

export const getUserWithSellerByEmail = async (email) => {
    try {
        await connectDB();    
      
        // Busca el usuario por email y popula el vendedor asociado
        const user = await User.findOne({ email: email }).populate('sellerId');
        if (!user) {
            return { user: null, seller: null };
          }
    
        // Extraemos el vendedor del resultado (puede ser null si no existe)
        const seller = user.sellerId || null;
    
        // Eliminamos el campo sellers del objeto user para mantener la estructura limpia
        const userObj = user.toObject();
        delete userObj.sellerId;

        return { user: userObj, seller };
      } catch (error) {
        console.error(error);
        return { error: error.message };
      }
  };