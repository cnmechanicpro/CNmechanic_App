import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { webConfigSchema } from '@cnmechanic/config';
export default defineConfig(({mode})=>{webConfigSchema.parse({...loadEnv(mode,process.cwd(),'VITE_'),...Object.fromEntries(Object.entries(process.env).filter(([k])=>k.startsWith('VITE_')))});return {plugins:[react(),tailwind()],server:{port:5173,strictPort:true},build:{sourcemap:false}};});
