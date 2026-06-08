import re

raw = '{\n  "task_title": "Build a Simple Todo List App using React",\n  "task_description": "1. Create a new React app using `create-react-app`.\n2. In the `App.js` file, define a state to store the todo items.\n3. Create a form to add new todo items and handle the form submission.\n4. Render a list of todo items using the `map` function.\n5. Add a button to delete each todo item.\n6. Verify by checking the todo list app in the browser.",\n  "starter_script": "import React, { useState } from \'react\';\nimport ReactDOM from \'react-dom\';\n\nfunction TodoList() {\n  const [todos, setTodos] = useState([]);\n  const [newTodo, setNewTodo] = useState(\'\');\n\n  const handleSubmit = (event) => {\n    event.preventDefault();\n    setTodos([...todos, { text: newTodo, completed: false }]);\n    setNewTodo(\'\');\n  };\n\n  const handleDelete = (index) => {\n    const updatedTodos = todos.filter((todo, i) => i !== index);\n    setTodos(updatedTodos);\n  };\n\n  return (\n    <div>\n      <h1>Todo List</h1>\n      <form onSubmit={handleSubmit}>\n        <input\n          type=\'text\'\n          value={newTodo}\n          onChange={(event) => setNewTodo(event.target.value)}\n          placeholder=\'Enter a new todo item\'\n        />\n        <button type=\'submit\'>Add Todo</button>\n      </form>\n      <ul>\n        {todos.map((todo, index) => (\n          <li key={index}>\n            {todo.text}\n            <button onClick={() => handleDelete(index)}>Delete</button>\n          </li>\n        ))}\n      </ul>\n    </div>\n  );\n}\n\nReactDOM.render(\n  <React.StrictMode>\n    <TodoList />\n  </React.StrictMode>,\n  document.getElementById(\'root\')\n);",\n  "estimated_hours": 4\n}'

def escape_newlines(match):
    s = match.group(0)
    # Don't escape if it's already an escaped newline
    return s.replace('\n', '\\n').replace('\r', '')

fixed = re.sub(r'"(?:\\.|[^"\\])*"', escape_newlines, raw)
print(fixed)

import json
print(json.loads(fixed))
