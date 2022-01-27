import { callAPI } from './fetchTodos.js';

// remove it
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

class MyEventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (typeof this.events[event] !== 'object') {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.removeListener(event, listener);
  }
  off(event, listener) {
    if (typeof this.events[event] === 'object') {
      const idx = this.events[event].indexOf(listener);
      if (idx > -1) {
        this.events[event].splice(idx, 1);
      }
    }
  }
  emit(event, ...args) {
    if (typeof this.events[event] === 'object') {
      this.events[event].forEach(listener => listener.apply(this, args));
    }
  }
}

class TodoService extends MyEventEmitter {
  constructor() {
    super();
    // remove it
    this.on('LocalStorageChange', () => {
      todoApp.render();
    });
  }


  //there should be method for getting todos !!!

  addTodo(value) {
    // e.preventDefault();
    // const input = document.querySelector('#mainInput');
    // const inputText = input.value.trim();
    callAPI('/todos', {
      method: 'POST',
      body: JSON.stringify(value),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }).then(data => {
      todoApp.render(data);
    });
    // if (inputText !== '') {
    // } else {
    //   alert('Write task description please!');
    // }

    const form = input.closest('form');
    form.reset();
  }

  deleteTodo(id) {
    // if (e.target.nodeName === 'BUTTON') {
      // const itemId = e.target.parentNode.id;
      callAPI(`/todos/?id=${id}`, {
        method: 'DELETE',
      }).then(data => {
        todoApp.render(data);
      });
    // }
  }

  handleAllCompleted() {
    callAPI('/todos/toggle-completed').then(data => {
      todoApp.render(data);
    });
  }

  // move to App
  handleFilter(e) {
    switch (e.target.id) {
      case 'All':
        callAPI('/todos').then(data => todoApp.renderTodoList(data));
        break;

      case 'Active':
        callAPI('/todos')
          .then(data => data.filter(todo => todo.completed === false))
          .then(data => todoApp.renderTodoList(data));

        break;

      case 'Completed':
        callAPI('/todos')
          .then(data => data.filter(todo => todo.completed === true))
          .then(data => todoApp.renderTodoList(data));

        break;

      default:
        break;
    }
  }

  handleClearCompleted() {
    callAPI('/todos/clear-completed').then(data => {
      todoApp.render(data);
    });
  }
}

const todoService = new TodoService();

class Form {
  constructor() {
    this.form = this.createForm();
  }

  createForm() {
    const form = document.createElement('form');
    form.classList.add('form');
    // it don't have to append itself, it have to do App 
    document.body.prepend(form);

    const title = document.createElement('h1');
    title.textContent = 'Todos';
    title.classList.add('title');
    form.prepend(title);

    const input = document.createElement('input');
    input.id = 'mainInput';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'What needs to be done?';
    input.classList.add('mainInput');

    // should be separate "Component"
    const label = document.createElement('label');
    label.classList.add('label');
    label.setAttribute('for', 'mainInput');
    label.addEventListener('click', todoService.handleAllCompleted);
    form.append(input, label);
    form.addEventListener('submit', todoService.addTodo);

    return form;
  }
}

class TodoItem {
  constructor({ id, description, completed }) {
    this.id = id;
    this.description = description;
    this.completed = completed;
    this.item = this.createLi();
  }

  createLi() {
    const itemTodo = document.createElement('li');
    itemTodo.classList.add('todoItem');
    itemTodo.id = this.id;

    const isCompleted = document.createElement('input');
    isCompleted.type = 'checkbox';
    isCompleted.id = 'check';
    isCompleted.completed = this.completed;
    this.completed
      ? isCompleted.classList.add('custom-checkbox', 'extra')
      : isCompleted.classList.add('custom-checkbox');

    const label = document.createElement('label');
    label.setAttribute('for', 'check');
    label.setAttribute('id', 'label');

    const text = document.createElement('p');
    this.completed
      ? text.classList.add('description', 'todoCompleted')
      : text.classList.add('description');
    text.textContent = this.description;

    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('btn');
    button.textContent = '×';

    itemTodo.append(isCompleted, label, text, button);
    itemTodo.addEventListener('click', this.handleCompleteTodo.bind(this));
    itemTodo.addEventListener('dblclick', this.handleChangeText.bind(this));
    return itemTodo;
  }

  handleCompleteTodo(e) {
    if (e.target.nodeName === 'LABEL') {
      const targetId = e.target.closest('li').id;
      const completed = e.target.closest('li').children[0].completed;

      //should be in TodoService
      callAPI(`/todos/?id=${targetId}`, {
        method: 'PUT',
        body: JSON.stringify({ id: targetId, completed: !completed }),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }).then(data => {
        todoApp.render(data);
      });
    }
  }

  //please change the name of method, maybe it should be toggleEditingMode
  handleChangeText(e) {
    if (e.target.tagName === 'P') {
      const target = e.target;
      const targetItem = e.target.parentNode;
      const label = targetItem.children[1];
      label.style.display = 'none';
      const btn = targetItem.children[3];
      btn.classList.add('editable');

      target.setAttribute('contenteditable', 'true');

      const editInput = document.createElement('input');
      target.appendChild(editInput);
      editInput.focus();
      editInput.value = target.innerText;
      target.innerText = editInput.value;

      let [r, s] = [document.createRange(), window.getSelection()];
      r.selectNodeContents(e.target);
      r.collapse(false);
      s.removeAllRanges();
      s.addRange(r);

      target.addEventListener('keydown', this.handleEnterAndEscape.bind(this));
      target.addEventListener('blur', this.handleBlur.bind(this));
    }
  }

  handleEnterAndEscape(e) {
    if (e.keyCode === 13) {
      this.handleChanges(e);
    }

    if (e.keyCode === 27) {
      callAPI('/todos').then(data => todoApp.renderTodoList(data));
    }
  }

  handleBlur(e) {
    this.handleChanges(e);
  }

  handleChanges(e) {
    const targetId = e.target.parentNode.id;
    const btn = e.target.parentNode.children[3];
    btn.classList.remove('editable');
    const newDescription = e.target.innerText;

    //should be in TodoService
    callAPI(`/todos/?id=${targetId}`, {
      method: 'PUT',
      body: JSON.stringify({ id: targetId, description: newDescription }),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }).then(data => todoApp.render(data));
  }
}

class App {
  constructor() {
    this.form = new Form();
    this.list = this.createTodoList()
  }


  start() {
    //shoud be in TodoService
    callAPI('/todos').then(data => {
      this.createTodoList(data);
      this.createFooterForm(data);
      this.checksForRefresh(data);
    });
  }
  render(array) {
    this.renderTodoList(array);
    this.renderFooterForm(array);
    this.checksForRefresh(array);
  }


  // it should only create ul layout
  createTodoList(array) {
    if (array.length !== 0) {
      const todoList = document.createElement('ul');
      todoList.addEventListener('click', todoService.deleteTodo);
      todoList.classList.add('todoList');


      // shouldn't be form`s child
      const form = document.querySelector('form');
      form.appendChild(todoList);

      // const todos = this.listLayout(array);
      // todoList.append(...todos);
    }
  }

  // it should map todos and append it to the ul
  renderTodoList(array) {
    //this.list.append(...todos) - example how it should look like
    const todoListRef = document.querySelector('.todoList');
    if (todoListRef) {
      todoListRef.innerHTML = '';
      const todos = this.listLayout(array);
      todoListRef.append(...todos);
    }
  }

  listLayout(array) {
    const todoItems = array.map(todo => {
      const itemTodo = new TodoItem({
        id: todo.id,
        description: todo.description,
        completed: todo.completed,
      });
      return itemTodo.item;
    });
    return todoItems;
  }

  // 1. It should be class variable (this.formFooter)
  // 2. Move it to the separate class
  createFooterForm(array) {
    const footerDiv = document.createElement('div');
    footerDiv.classList.add('footerDiv');
    const form = document.querySelector('form');
    form.appendChild(footerDiv);
    this.checksForRefresh(array);

    const quantity = document.createElement('span');
    const activeTodos = array.filter(todo => todo.completed !== true);
    quantity.textContent = activeTodos.length + ` item left`;

    const filterBtns = document.createElement('div');
    const btnAll = document.createElement('button');
    btnAll.type = 'button';
    btnAll.classList.add('filterBtn');
    btnAll.textContent = 'All';
    btnAll.id = 'All';
    const btnActive = document.createElement('button');
    btnActive.type = 'button';
    btnActive.classList.add('filterBtn');
    btnActive.textContent = 'Active';
    btnActive.id = 'Active';
    const btnCompleted = document.createElement('button');
    btnCompleted.type = 'button';
    btnCompleted.classList.add('filterBtn');
    btnCompleted.textContent = 'Completed';
    btnCompleted.id = 'Completed';
    filterBtns.append(btnAll, btnActive, btnCompleted);
    filterBtns.addEventListener('click', todoService.handleFilter);

    const btnClear = document.createElement('button');
    btnClear.type = 'button';
    btnClear.classList.add('clearBtn');
    btnClear.textContent = 'Clear completed';
    btnClear.id = 'clear';
    btnClear.addEventListener('click', todoService.handleClearCompleted);
    footerDiv.append(quantity, filterBtns, btnClear);
  }

  //
  renderFooterForm(array) {
    const footerDivRef = document.querySelector('.footerDiv');

    const quantity = document.querySelector('span');
    const activeTodos = array.filter(todo => todo.completed !== true);
    quantity.textContent = activeTodos.length + ` item left`;

    const btnClear = document.querySelector('#clear');
    const isAnyCompleted = array.some(todo => todo.completed === true);
    if (isAnyCompleted) {
      btnClear?.classList.add('clearBtnShow');
    } else {
      btnClear?.classList.remove('clearBtnShow');
    }
    footerDivRef.prepend(quantity);
    footerDivRef.append(btnClear);
  }

  // instad of using querySelector, please use class variables
  // move items to separate "Components" (classes)
  checksForRefresh(array) {
    const footerForm = document.querySelector('.footerDiv');
    if (array.length === 0) {
      footerForm.style.display = 'none';
    } else {
      footerForm.style.display = 'flex';
    }

    const labelRef = document.querySelector('.label');
    if (array.length === 0) {
      labelRef.style.display = 'none';
    } else {
      labelRef.style.display = 'flex';
    }

    const inputRef = document.querySelector('.mainInput');
    if (array.every(todo => todo.completed === true)) {
      inputRef.classList.add('extra');
    } else {
      inputRef.classList.remove('extra');
    }

    const btnClear = footerForm.querySelector('.clearBtn');
    const isAnyCompleted = array.some(todo => todo.completed === true);
    if (isAnyCompleted) {
      btnClear?.classList.add('clearBtnShow');
    } else {
      btnClear?.classList.remove('clearBtnShow');
    }
  }
}

const todoApp = new App();
todoApp.start();


// Try not to use querySelector, you have class instanses