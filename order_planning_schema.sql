-- Solución completa y permisiva para el error 42501 en pedidos de compra

-- 1. Asegurar que las tablas tengan RLS habilitado (opcional si ya estaba, pero buena práctica)
ALTER TABLE public.purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_item ENABLE ROW LEVEL SECURITY;

-- 2. Grant de accesos a nivel de base de datos para los roles anon y authenticated
GRANT ALL ON TABLE public.purchase_order TO anon, authenticated;
GRANT ALL ON TABLE public.purchase_order_item TO anon, authenticated;

-- *** 🚀 NUEVO: Conceder permisos sobre las secuencias autoincrementables (ID) ***
GRANT USAGE, SELECT ON SEQUENCE public.purchase_order_order_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.purchase_order_item_item_id_seq TO anon, authenticated;

-- 3. Políticas RLS totalmente permisivas para `purchase_order`
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.purchase_order;
CREATE POLICY "Enable all operations for all users" 
ON public.purchase_order 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- 4. Políticas RLS totalmente permisivas para `purchase_order_item`
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.purchase_order_item;
CREATE POLICY "Enable all operations for all users" 
ON public.purchase_order_item 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);
