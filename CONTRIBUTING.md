# Guía de Contribución

¡Gracias por tu interés en contribuir a Molinos App! Esta guía te ayudará a configurar tu entorno y trabajar en el proyecto.

## 1. Prerrequisitos

Asegúrate de tener instalado:
- **Git**: [Descargar Git](https://git-scm.com/downloads)
- **Node.js** (v18 o superior): [Descargar Node.js](https://nodejs.org/)

## 2. Configuración Inicial (Para el nuevo desarrollador)

Si eres un nuevo colaborador, sigue estos pasos para obtener el código en tu máquina local.

### 1. Clonar el repositorio
Abre tu terminal y ejecuta:

```bash
git clone https://github.com/analisisdatosmolinosguajira-commits/molinos-app.git
cd molinos-app
```

### 2. Instalar dependencias
Instala las librerías necesarias con npm:

```bash
npm install
```

### 3. Crear un archivo de variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto (puedes copiar el ejemplo si existe, o pedirle las claves al administrador del proyecto).

## 3. Flujo de Trabajo (Git Flow)

Para mantener el código ordenado, seguimos este flujo:

1.  **Actualizar tu rama principal**:
    Siempre empieza asegurándote de tener lo último los cambios:
    ```bash
    git checkout main
    git pull origin main
    ```

2.  **Crear una rama para tu tarea**:
    No trabajes directo en `main`. Crea una rama con un nombre descriptivo:
    ```bash
    git checkout -b feature/nombre-de-la-nueva-funcionalidad
    # o si es un arreglo
    git checkout -b fix/nombre-del-error
    ```

3.  **Hacer cambios y guardar (Commit)**:
    Realiza tus cambios en el código. Luego guárdalos:
    ```bash
    git add .
    git commit -m "Descripción clara de lo que hiciste"
    ```

4.  **Subir cambios (Push)**:
    Sube tu rama al repositorio remoto (GitHub):
    ```bash
    git push -u origin feature/nombre-de-la-nueva-funcionalidad
    ```

5.  **Crear un Pull Request (PR)**:
    - Ve al repositorio en GitHub.
    - Verás un botón para crear un "Compare & pull request".
    - Describe tus cambios y solicita revisión.

## 4. Agregar Colaboradores (Para el Administrador del Repositorio)

Como administrador, para permitir que otros hagan `push` al repositorio:

1.  Ve a la página principal del repositorio en GitHub.
2.  Haz clic en **Settings** (Configuración) en la barra superior.
3.  En el menú lateral izquierdo, selecciona **Collaborators**.
4.  Haz clic en **Add people**.
5.  Ingresa el **email** o **usuario de GitHub** de la persona que quieres invitar.
6.  Selecciona el usuario y dale clic a **Add ... to this repository**.
7.  El usuario recibirá una invitación por correo que debe aceptar.

---

## Comandos Útiles

- `npm run dev`: Inicia el servidor de desarrollo local.
- `git status`: Ver el estado de tus archivos.
