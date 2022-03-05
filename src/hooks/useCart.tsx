import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  const storagedCart = localStorage.getItem('@RocketShoes:cart');

   if (storagedCart) {
     return JSON.parse(storagedCart);
  }
    return [];
  });

const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);


  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExist = updatedCart.find(product=> product.id === productId);

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount;
      const currentAmount = productExist ? productExist.amount : 0;
      const amount = currentAmount + 1 ;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExist){
        productExist.amount = amount;

      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1 
        }
        updatedCart.push(newProduct);
      } 

      setCart(updatedCart);
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExistsCart = cart.find(product => product.id === productId);

      if (!productExistsCart) {
        throw new Error('Produto não encontrado no carrinho')
      }

      const newCart = cart.filter(product => product.id !== productId)
      
      setCart(newCart)
 
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error('Alteraçáo inválida')
      }

      const { data: stockData } = await api.get(`/stock/${productId}`)

      if (stockData.amount <= amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const newCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      })

      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
