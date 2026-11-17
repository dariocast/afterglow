import './styles/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Could not find element with id "app" to mount Afterglow');
}

const app = mount(App, {
  target,
});

export default app;
