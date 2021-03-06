var derby = require('derby');
var app = module.exports = derby.createApp('private-todos', __filename);

global.app = app;

app.loadViews(__dirname + '/views');
app.loadStyles(__dirname + '/styles');

app.on('model', function(model) {
    model.fn('all', function(item) {
        return true;
    });
    model.fn('completed', function(item) {
        return item.completed;
    });
    model.fn('active', function(item) {
        return !item.completed;
    });

    model.fn('counters', function(todos) {

        var counters = {
            active: 0,
            completed: 0
        };

        for (var id in todos) {
            if (todos[id].completed) counters.completed++;
            else counters.active++;
        }
        return counters;
    });

});

app.get('*', function(page, model, params, next) {
    if (model.get('_session.loggedIn')) {
        var userId = model.get('_session.userId');
        var user = model.at('users.' + userId);
        model.subscribe(user, function() {
            model.ref('_session.user', user);
            next();
        });
    } else {
        next();
    }
});

app.get('/', getPage('all'));
app.get('/active', getPage('active'));
app.get('/completed', getPage('completed'));

function getPage(filter) {
    return function(page, model) {
        var todos = model.query('todos', {
            ownerId: model.get('_session.userId')
        });
        model.subscribe(todos, function() {
            model.filter('todos', filter).ref('_page.todos');
            model.start('_page.counters', 'todos', 'counters');
            page.render();
        });
    };
}

app.proto.addTodo = function(newTodo) {
    if (!newTodo) return;
    this.model.add('todos', {
        text: newTodo,
        completed: false,
        ownerId: this.model.get('_session.userId')
    });
    this.model.set('_page.newTodo', '');
};

app.proto.delTodo = function(todoId) {
    this.model.del('todos.' + todoId);
};

app.proto.clearCompleted = function() {
    var todos = this.model.get('todos');

    for (var id in todos) {
        if (todos[id].completed) this.model.del('todos.' + id);
    }
};

app.proto.editTodo = function(todo) {

    this.model.set('_page.edit', {
        id: todo.id,
        text: todo.text
    });

    window.getSelection().removeAllRanges();
    document.getElementById(todo.id).focus();
};

app.proto.doneEditing = function(todo) {
    this.model.set('todos.' + todo.id + '.text', todo.text);
    this.model.set('_page.edit', {
        id: undefined,
        text: ''
    });
};

app.proto.cancelEditing = function(e) {
    // 27 = ESQ-key
    if (e.keyCode == 27) {
        this.model.set('_page.edit.id', undefined);
    }
};
