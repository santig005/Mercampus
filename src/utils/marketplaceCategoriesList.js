// Importar iconos para marketplace (puedes agregar más según necesites)
import AccesoriosIcon from '/public/images/category/accesorios.png';
import MaquillajeIcon from '/public/images/category/maquillaje.png';
import RopaIcon from '/public/images/category/ropa.png';
export const marketplaceCategoriesList = [
  {
    name: 'Todos',
    icon: '',
  },
  {
    name: 'Accesorios',
    icon: AccesoriosIcon?.src || '',
  },
  {
    name: 'Maquillaje',
    icon: MaquillajeIcon?.src || '',
  },
  {
    name: 'Ropa',
    icon: RopaIcon?.src || '',
  },
  {
    name: 'Otros',
    icon: '',
  }
];
