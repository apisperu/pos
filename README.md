# Tienda Punto de Venta
 Aplicación de punto de venta de escritorio creada con electron
 
  **Características:**

- Puede ser utilizado por múltiples PC en una red con una base de datos central. (En proceso)
- Impresión de recibos.
- Búsqueda de producto por código de barras.
- Cuentas y permisos del personal.
- Productos y Categorías.
- Gestión básica de stock.
- Pestañas abiertas (Pedidos).
- Base de datos de cliente.
- Historial de transacciones (Ventas).
- Filtrar Transacciones por Caja, Cajero o Estado.
- Filtrar transacciones por rango de fechas.

 **Para usar en Windows:**
 [Descargar](https://github.com/apisperu/pos/releases) la última versión del instalador .exe

El nombre de usuario y la contraseña predeterminados son **admin**

**Consideraciónes para usar una nueva versión**
1. Generar un backup de toda la información que tiene
  - copiar todos los archivos de la carpeta **db** 
  ```
  carpeta_de_instalación/db/
  ```
  - Las carpetas a copiar son:
  ```
  - categories
  - customers
  - documents
  - inventory
  - logs
  - settings
  - transactions
  - users
  ```
2. Realizar la instación del nuevo sistema.
  - Copiar todos los archivos anteriormente guardados a la carpeta **db** y reemplazar los que ya existen
  ```
  carpeta_de_instalación/db/
  ```
  

**Para personalizar/crear su propio instalador**

- Clonar este proyecto.
- Abra la terminal y navegue a la carpeta clonada.
- Ejecute "npm install" para instalar las dependencias.
- Ejecute "npm run electron".

![POS](https://github.com/apisperu/pos-electron/blob/master/screenshots/pos.png)

![Transacciones](https://github.com/apisperu/pos-electron/blob/master/screenshots/transactions.png)

![Recibo](https://github.com/apisperu/pos-electron/blob/master/screenshots/receipt.png)

![Permisos](https://github.com/apisperu/pos-electron/blob/master/screenshots/permissions.png)

![Usuarios](https://github.com/apisperu/pos-electron/blob/master/screenshots/users.png)