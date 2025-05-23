import Brownie from '/public/images/category/brownie.png';
import MangoRender from '/public/images/category/manguito.png';
import GalletaRender from '/public/images/category/galleta.png';
import DulceRender from '/public/images/category/dulce.png';
import Empanada from '/public/images/category/empanada.png';
import Papas from '/public/images/category/papas.png';
import Helados from '/public/images/category/helados.png';
import Snacks from '/public/images/category/snacks.webp';
import HamburguesaRender from '/public/images/category/hamburguesa.webp';


export const categoriesList = [
  {
    name: 'Todos',
    icon: '',
  },
  {
    name: 'Panadería',
    icon: Empanada.src,
  },
  {
    name: 'Galletas',
    icon: GalletaRender.src,
  },
  {
    name: 'Repostería',
    icon: Brownie.src,
  },
  {
    name: 'Frutas',
    icon: MangoRender.src,
  },
  {
    name: 'Frituras',
    icon: Papas.src,
  },
  {
    name: 'Dulces',
    icon: DulceRender.src,
  },
  {
    name: 'Helados',
    icon: Helados.src,
  },
  {
    name: 'Snacks',
    icon: Snacks.src,
  },
  {
    name: 'Comida rápida',
    icon: HamburguesaRender.src,
  },
  {
    name: 'Otros',
    icon: '',
  }
];
