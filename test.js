const loader = require('./index')



loader.define('MyModule', function(private_store) {
    function MyClass(name, age) {
        //Creates the private storage facility. Called once in constructor.
        private_store("create", this);

        this.name = name;
        this.age = age;

        //Retrieve the private storage object from the storage facility.
        private_store("get", this).no = 1;
    }

    MyClass.prototype.incrementPrivateVar = function() {
        private_store("get", this).no += 1;
    }

    MyClass.prototype.getPrivateVar = function() {
        return private_store("get", this).no;
    }

    this.exports = MyClass;
})

loader.define('OtherModule', function(private_store) {

    this.exports = function(age, name) {
        console.log('age' + age)
        console.log('name ' + name);
        return 1;
    };
})

loader.define('OtherOtherModule', function(private_store) {

    this.exports = {
        MyFunction() {
            console.log('wooohooo');
            return 2;
        }
    }
})

loader.on('before_instance_created', function(__moduleName, _hiJacked, arguments) {
        console.log('Before an instance was created')
        console.log(__moduleName)
        console.log(_hiJacked)
        console.log(arguments)
    })
    /*
        Called after an exported instance is created. Just realized this would be the perfect module loader for testing.
    */
loader.on('after_instance_created', function(__moduleName, _hiJacked, arguments, hiJacked) {
    console.log('An instance was created')
    console.log(__moduleName)
    console.log(_hiJacked)
    console.log(arguments)
    console.log(hiJacked)
})


loader.on('before_function_called', function(__moduleName, _hiJacked, arguments) {
    console.log('Before a function was called');
    console.log(__moduleName);
    console.log(_hiJacked);
    console.log(arguments);
})

/*
    Called after an exported function is called
*/
loader.on('after_function_called', function(__moduleName, _hiJacked, arguments, result) {
    console.log('A function was called');
    console.log(__moduleName);
    console.log(_hiJacked);
    console.log(arguments);
    console.log(result);
})

//Get whatever is exported from MyModule
const MyClass = loader.require('MyModule');

//Create a new instance of `MyClass`
const myClass = new MyClass("Person", 22);

//Create another instance of `MyClass`
const myClass2 = new MyClass("Person2", 23);

//print out current private vars
console.log('pVar = ' + myClass.getPrivateVar())
console.log('pVar2 = ' + myClass2.getPrivateVar())

//Increment it
myClass.incrementPrivateVar()

//Print out to see if one affected the other or shared
console.log('pVar after increment = ' + myClass.getPrivateVar())
console.log('pVar after increment on other class = ' + myClass2.getPrivateVar())

//Clean up.
loader.remove('MyModule')

const exportedFunction = loader.require('OtherModule')
exportedFunction('dale', '23');

const otherModule = loader.require('OtherOtherModule')
otherModule.MyFunction();