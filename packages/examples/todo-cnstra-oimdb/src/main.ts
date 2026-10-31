import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import { TODO_APP } from './TODO_APP';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

backend.render(TODO_APP, document.getElementById('root') as HTMLElement);
