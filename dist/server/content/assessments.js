import { ASSESSMENT_RULES } from './levels.js';
const q = (key, concept, prompt, choices, answer, hint, explanation, code) => ({ key, concept, prompt, choices, answer, hint, explanation, ...(code ? { code } : {}) });
const PRETEST_EASY = [
    q('pre-easy-1', 'Foundations', 'Which of the following correctly defines a class in OOP?', [
        'A loop that repeats code',
        'A blueprint for creating objects',
        'A method of abstraction',
        'A library of functions',
    ], 1, 'Classes define the structure and behavior of objects.', 'A class is a blueprint. It describes the attributes and methods that its objects will have.'),
    q('pre-easy-2', 'Foundations', 'In OOP, what do we call the real-world entity created from a class?', [
        'Method', 'Object', 'Variable', 'Function',
    ], 1, 'Objects are instances of classes, representing real-world entities.', 'An object is an instance of a class — the concrete entity built from the blueprint.'),
    q('pre-easy-3', 'Foundations', 'Which of these is NOT an OOP principle?', [
        'Inheritance', 'Encapsulation', 'Polymorphism', 'Compilation',
    ], 3, 'Compilation is part of program execution, not an OOP concept.', 'The four OOP pillars are encapsulation, abstraction, inheritance, and polymorphism. Compilation is a build step.'),
    q('pre-easy-4', 'Encapsulation', 'What does Encapsulation mean in OOP?', [
        'Wrapping data and methods together',
        'Using many functions at once',
        'Breaking code into similar parts',
        'Writing loops inside a class',
    ], 0, 'Encapsulation hides data and bundles it with methods.', 'Encapsulation bundles data and the methods that operate on it, and controls access to the data.'),
    q('pre-easy-5', 'Encapsulation', 'In C++, which access modifier makes a class member visible everywhere?', [
        'private', 'public', 'protected', 'internal',
    ], 1, 'public allows unrestricted access across the program.', 'public members are accessible from anywhere the object is visible.'),
];
const PRETEST_MODERATE = [
    q('pre-mod-1', 'Polymorphism', 'Given the code snippet below, what will be the output?', [
        'Animal sound', 'Bark', 'Error in compilation', 'No output',
    ], 1, 'Polymorphism allows myDog.Sound() to use the Dog implementation.', 'myDog is an Animal pointer to a Dog object. Because Sound() is virtual and overridden, Dog::Sound runs.', `class Animal {
  public virtual void Sound() {
    Console.WriteLine("Animal sound");
  }
}
class Dog : Animal {
  public override void Sound() {
    Console.WriteLine("Bark");
  }
}
class Program {
  static void Main(string[] args) {
    Animal myDog = new Dog();
    myDog.Sound();
  }
}`),
    q('pre-mod-2', 'Inheritance', 'Which access modifier allows a class member to be accessible only within its class and derived classes?', [
        'private', 'protected', 'public', 'internal',
    ], 1, 'protected allows access within the same class and subclasses.', 'protected sits between private and public: the class itself and its derived classes can use the member.'),
    q('pre-mod-3', 'Abstraction', 'What will happen if you create an object of an abstract class in C++?', [
        'It will compile successfully.',
        'It will cause a runtime error.',
        'It will cause a compilation error.',
        'It will create an empty object.',
    ], 2, 'Abstract classes cannot be instantiated.', 'A class with a pure virtual function is abstract; the compiler rejects creating an object of it.'),
    q('pre-mod-4', 'Encapsulation', 'In C++, which of the following best demonstrates encapsulation?', [
        'Declaring a variable as public',
        'Grouping methods and variables inside a class and making them private',
        'Overriding a method in a child class',
        'Writing methods with the same name but different parameters',
    ], 1, 'Encapsulation hides implementation and protects data.', 'Encapsulation means bundling data with behaviour and restricting direct access to the data.'),
    q('pre-mod-5', 'Abstraction', 'Suppose you created a generic class Box<T>. What does <T> represent?', [
        'A type parameter that can be replaced with any data type',
        'A constant value for a class',
        'A loop variable',
        'A default C++ type',
    ], 0, 'Generics allow defining a class with placeholders for data types.', '<T> is a type parameter — a placeholder replaced by a concrete type when the class is used.'),
];
const PRETEST_CHALLENGING = [
    q('pre-chal-1', 'Polymorphism', 'Debugging scenario: what will be the output of the following code?', [
        'Class A', 'Class B', 'Class C', 'Error',
    ], 1, 'new hides the method in C, but since obj is of type A, it calls the overridden method in B.', 'Show() is virtual in A and overridden in B. C hides it with new. Through an A pointer the vtable still resolves to B::Show.', `class A {
  public virtual void Show() {
    Console.WriteLine("Class A");
  }
}
class B : A {
  public override void Show() {
    Console.WriteLine("Class B");
  }
}
class C : B {
  public new void Show() {
    Console.WriteLine("Class C");
  }
}
class Program {
  static void Main() {
    A obj = new C();
    obj.Show();
  }
}`),
    q('pre-chal-2', 'Polymorphism', 'Which of the following situations BEST demonstrates polymorphism in C++?', [
        'Having multiple classes share a single base class.',
        'A subclass overriding a parent class method with its own implementation.',
        'Creating multiple objects of the same class.',
        'Declaring private variables inside a class.',
    ], 1, 'This is method overriding — runtime polymorphism.', 'Overriding a virtual base method with a derived implementation lets one interface produce different behaviour.'),
    q('pre-chal-3', 'Foundations', 'Consider this code snippet. What will be printed?', [
        '1', '2', '4', 'Error',
    ], 1, 'LINQ filters even numbers to [2, 4]. The first element is 2.', 'Where(n => n % 2 == 0) keeps 2 and 4, so result[0] is 2.', `List<int> numbers = new List<int>(){1,2,3,4,5};
var result = numbers.Where(n => n % 2 == 0).ToList();
Console.WriteLine(result[0]);`),
    q('pre-chal-4', 'Abstraction', 'Which of the following is the MOST accurate statement about interfaces?', [
        'Interfaces can contain both implementation and declarations.',
        'A class can inherit only one interface.',
        'Interfaces support multiple inheritance of type definitions.',
        'Interfaces are slower than classes and not recommended.',
    ], 2, 'A class can implement multiple interfaces.', 'Interfaces define a contract; a class may implement many of them, which gives multiple inheritance of type.'),
    q('pre-chal-5', 'Encapsulation', 'You are tasked to design a program using encapsulation. Which of the following best applies it?', [
        'Creating private fields and exposing them through public properties.',
        'Writing a method with the same name in different classes.',
        'Creating multiple constructors with different parameters.',
        'Using an abstract method inside an abstract class.',
    ], 0, 'Encapsulation = data hiding + controlled access.', 'Private fields protect the state; public properties or getters/setters provide controlled access.'),
];
const PRETEST_TOUGH = [
    q('pre-tough-1', 'Abstraction', 'What will be the output of this program?', [
        '6.28', '12.57', '3.14', 'Error',
    ], 1, 'Area = π × r² = 3.14 × 4 ≈ 12.57.', 'Radius is 2, so π × 2 × 2 ≈ 12.566, formatted to two decimals as 12.57.', `interface IShape {
  double Area();
}
class Circle : IShape {
  public double Radius { get; set; }
  public Circle(double r) { Radius = r; }
  public double Area() { return Math.PI * Radius * Radius; }
}
class Program {
  static void Main() {
    IShape s = new Circle(2);
    Console.WriteLine(s.Area().ToString("F2"));
  }
}`),
    q('pre-tough-2', 'Foundations', 'Which of the following BEST demonstrates exception handling in C++?', [
        'Using if-else for error checking.',
        'Wrapping risky code inside a try block with a catch to handle errors.',
        'Declaring variables as private for safety.',
        'Writing a program without bugs.',
    ], 1, 'Exception handling keeps the program flow intact despite runtime errors.', 'try/catch separates the risky operation from the recovery logic.'),
    q('pre-tough-3', 'Polymorphism', 'What is the output of this code?', [
        'Base', 'Derived', 'Error', 'Both Base and Derived',
    ], 1, 'virtual + override allows runtime polymorphism.', 'A Base pointer holding a Derived object dispatches to Derived::Show at runtime.', `class Base {
  public virtual void Show() { Console.WriteLine("Base"); }
}
class Derived : Base {
  public override void Show() { Console.WriteLine("Derived"); }
}
class Program {
  static void Main() {
    Base obj = new Derived();
    obj.Show();
  }
}`),
    q('pre-tough-4', 'Foundations', 'Which LINQ query returns all odd numbers from the list numbers?', [
        'var result = numbers.Where(n => n % 2 == 0);',
        'var result = numbers.Select(n => n % 2 != 0);',
        'var result = numbers.Where(n => n % 2 != 0);',
        'var result = numbers.Find(n => n % 2 != 0);',
    ], 2, 'Where filters items by condition; != 0 means odd numbers.', 'Where keeps items matching the predicate; n % 2 != 0 keeps the odd values.'),
    q('pre-tough-5', 'Foundations', 'Which scenario shows the use of multithreading in C++?', [
        'Saving data to a file using one process.',
        'Running multiple tasks (e.g. downloading and processing) at the same time.',
        'Calling methods in a sequence.',
        'Writing code in multiple classes.',
    ], 1, 'Multithreading allows concurrent execution.', 'Multithreading means several threads make progress concurrently instead of strictly one after another.'),
];
const POSTTEST_EASY = [
    q('post-easy-1', 'Inheritance', 'What does inheritance allow in Object-Oriented Programming?', [
        'One class to hide data from another',
        'One class to acquire attributes and behaviors of another',
        'One method to perform multiple tasks',
        'One class to contain only abstract methods',
    ], 1, 'Inheritance allows a derived class to reuse properties and methods of a base class.', 'A derived class inherits the attributes and behaviours of its base class and can extend them.'),
    q('post-easy-2', 'Inheritance', 'Which symbol is used in C++ to declare inheritance?', [
        ':', ';', '{ }', '( )',
    ], 0, 'class Child : public Parent uses : for inheritance.', 'In C++ the colon introduces the base-class list: class Car : public Vehicle.'),
    q('post-easy-3', 'Encapsulation', 'Which keyword in C++ is used to hide data inside a class?', [
        'public', 'private', 'protected', 'static',
    ], 1, 'private restricts access to data members.', 'private members are only reachable from inside the class itself.'),
    q('post-easy-4', 'Encapsulation', 'Which method allows controlled access to private data?', [
        'getter and setter methods',
        'loops and conditions',
        'constructors',
        'headers',
    ], 0, 'Encapsulation uses getter/setter methods to safely access private data.', 'Getters and setters expose controlled reads and validated writes of private fields.'),
    q('post-easy-5', 'Abstraction', 'In C++, abstraction is implemented using:', [
        'Loops',
        'Abstract classes and pure virtual functions',
        'Templates',
        'Constructors',
    ], 1, 'Abstraction hides implementation details using abstract classes and pure virtual functions.', 'An abstract class declares the interface; derived classes supply the implementation.'),
    q('post-easy-6', 'Abstraction', 'What does declaring virtual void draw() = 0; mean?', [
        'The function is private',
        'The function is overloaded',
        'The function is a pure virtual function',
        'The function is inline',
    ], 2, '= 0 means pure virtual — no implementation in the base class.', 'The = 0 syntax marks a pure virtual function and makes the containing class abstract.'),
    q('post-easy-7', 'Polymorphism', 'What does polymorphism mean in Object-Oriented Programming?', [
        'One object can inherit many classes',
        'One function can have multiple forms',
        'One class can contain only public methods',
        'One function can only be static',
    ], 1, 'Polymorphism = “many forms”: a function behaves differently depending on the object.', 'Polymorphism lets one interface stand for several implementations.'),
    q('post-easy-8', 'Polymorphism', 'Which keyword in C++ enables runtime polymorphism?', [
        'abstract', 'protected', 'virtual', 'override',
    ], 2, 'Declaring a function as virtual allows derived classes to override it at runtime.', 'virtual enables dynamic dispatch; override is an optional check in the derived class.'),
];
const POSTTEST_MODERATE = [
    q('post-mod-1', 'Inheritance', 'What will be the output?', [
        'Class A', 'Class B', 'Error', 'Both A and B',
    ], 1, 'The show() method in B overrides A’s version. Since obj is of type B, Class B is displayed.', 'obj is a B object, so B::show() runs.', `class A {
public:
  void show() { cout << "Class A"; }
};
class B : public A {
public:
  void show() { cout << "Class B"; }
};
int main() {
  B obj;
  obj.show();
}`),
    q('post-mod-2', 'Inheritance', 'Fill in the blank to correctly inherit Car from Vehicle:', [
        'extends', ': public', 'inherits', ': protected',
    ], 1, 'C++ uses : public to show inheritance. extends is for Java, not C++.', 'class Car : public Vehicle declares public inheritance in C++.', 'class Car ______ Vehicle { };'),
    q('post-mod-3', 'Encapsulation', 'Why is encapsulation important in C++ classes?', [
        'To allow direct access to variables.',
        'To hide data and control access using methods.',
        'To avoid creating objects.',
        'To make functions global.',
    ], 1, 'Encapsulation hides sensitive data by using private members and controlling access via getters/setters.', 'It protects invariants: the class decides how its state may change.'),
    q('post-mod-4', 'Encapsulation', 'What will the code output?', [
        '0', '20', 'Error', 'Undefined',
    ], 1, 'The setter updates age to 20, and the getter retrieves it, so the output is 20.', 'setAge(20) stores 20 in the private field; getAge() returns it.', `class Student {
private:
  int age;
public:
  void setAge(int a) { age = a; }
  int getAge() { return age; }
};
int main() {
  Student s;
  s.setAge(20);
  cout << s.getAge();
}`),
    q('post-mod-5', 'Abstraction', 'Which makes a class abstract in C++?', [
        'Declaring at least one pure virtual function',
        'Using the abstract keyword',
        'Making all members private',
        'Inheriting from another class',
    ], 0, 'C++ has no abstract keyword. A class is abstract when it has at least one pure virtual function (= 0).', 'Any class containing a pure virtual function is abstract and cannot be instantiated.'),
    q('post-mod-6', 'Abstraction', 'What happens if a derived class does not implement all pure virtual functions?', [
        'It becomes abstract itself',
        'It compiles but errors at runtime',
        'It implements them automatically',
        'They are ignored',
    ], 0, 'If a derived class does not override pure virtual functions, it remains abstract and cannot be instantiated.', 'Unimplemented pure virtual functions keep the derived class abstract.'),
    q('post-mod-7', 'Polymorphism', 'What is the output?', [
        'Animal', 'Dog', 'AnimalDog', 'Error',
    ], 1, 'Because of the virtual keyword, runtime polymorphism occurs. The pointer a calls Dog’s overridden function.', 'Dynamic dispatch through the base pointer selects Dog::speak.', `class Animal {
public:
  virtual void speak() { cout << "Animal"; }
};
class Dog : public Animal {
public:
  void speak() override { cout << "Dog"; }
};
int main() {
  Animal* a = new Dog();
  a->speak();
}`),
    q('post-mod-8', 'Polymorphism', 'Function overloading in C++ is resolved at:', [
        'Runtime', 'Compile-time', 'Link-time', 'Execution-time',
    ], 1, 'Overloading (same name, different parameters) is decided by the compiler — compile-time.', 'The compiler picks the overload from the static argument types — static binding.'),
];
const POSTTEST_CHALLENGING = [
    q('post-chal-1', 'Polymorphism', 'What is wrong with this code?', [
        'override cannot be used without virtual in the base class',
        'Missing semicolon after class Dog',
        'Cannot inherit without protected',
        'No error',
    ], 0, 'In C++, a function must be declared virtual in the base class before a derived function can use override.', 'override checks that a virtual base function is being overridden; here speak() is not virtual.', `class Animal {
public:
  void speak() { cout << "Animal"; }
};
class Dog : public Animal {
public:
  void speak() override { cout << "Dog"; }
};`),
    q('post-chal-2', 'Inheritance', 'Predict the output:', [
        'Base Derived', 'Derived Base', 'Derived only', 'Error',
    ], 0, 'When creating a Derived object, the Base constructor runs first, then the Derived constructor.', 'Construction order is base first, derived second.', `class Base {
public:
  Base() { cout << "Base "; }
};
class Derived : public Base {
public:
  Derived() { cout << "Derived"; }
};
int main() {
  Derived d;
}`),
    q('post-chal-3', 'Encapsulation', 'Why does this code fail to compile?', [
        'age is private and cannot be accessed directly',
        'Missing constructor',
        'No main function return type',
        'Needs public inheritance',
    ], 0, 'age is declared private, so it cannot be accessed outside the class.', 's.age = 20 is illegal from outside the class; a setter or friend is needed.', `class Student {
private:
  int age;
};
int main() {
  Student s;
  s.age = 20;
}`),
    q('post-chal-4', 'Encapsulation', 'Which is the best way to securely set a salary variable?', [
        'Make salary public',
        'Use a setter function that validates input',
        'Use protected keyword',
        'Assign directly in main',
    ], 1, 'Encapsulation means using setter functions to validate and safely update private variables.', 'A validating setter keeps the object in a valid state and hides the field.'),
    q('post-chal-5', 'Abstraction', 'Predict the output:', [
        'Error', 'Circle', 'Shape', 'Nothing',
    ], 1, 'Shape is abstract, but Circle implements draw(). A base pointer to a derived object calls Circle’s version.', 'The abstract base cannot be instantiated, but a Circle through a Shape* is valid and dispatches to Circle::draw.', `class Shape {
public:
  virtual void draw() = 0;
};
class Circle : public Shape {
public:
  void draw() { cout << "Circle"; }
};
int main() {
  Shape* s = new Circle();
  s->draw();
}`),
    q('post-chal-6', 'Abstraction', 'What is wrong with this abstract class usage?', [
        'Pure virtual functions need implementation',
        'Cannot instantiate an abstract class',
        'Missing semicolon',
        'Needs inheritance',
    ], 1, 'Abstract classes cannot be instantiated directly. They require a derived class implementation.', 'Abstract a; is rejected by the compiler because Abstract has a pure virtual function.', `class Abstract {
public:
  virtual void display() = 0;
};
int main() {
  Abstract a;
}`),
    q('post-chal-7', 'Polymorphism', 'Predict the output:', [
        'Animal', 'Meow', 'Animal Meow', 'Error',
    ], 0, 'a is a base object, not a pointer. Virtual dispatch does not apply, so Animal’s method runs.', 'Slicing/static type: a is an Animal value, so Animal::sound() is called.', `class Animal {
public:
  virtual void sound() { cout << "Animal"; }
};
class Cat : public Animal {
public:
  void sound() { cout << "Meow"; }
};
int main() {
  Animal a;
  a.sound();
}`),
    q('post-chal-8', 'Polymorphism', 'Why is this code wrong?', [
        'Ambiguity in overloaded methods',
        'Must declare virtual functions',
        'Constructors missing',
        'add() cannot be overloaded',
    ], 0, 'Passing 5 (int) and 2.5 (float) creates ambiguity between int add(int,int) and float add(float,float).', 'The mixed argument types make both overloads viable, so the call is ambiguous.', `class Math {
public:
  int add(int a, int b) { return a + b; }
  float add(float a, float b) { return a + b; }
};
int main() {
  Math m;
  cout << m.add(5, 2.5);
}`),
];
const POSTTEST_TOUGH = [
    q('post-tough-1', 'Inheritance', 'Fill in the missing part to correctly implement inheritance.', [
        'inherits', 'extends', ': public', 'implements',
    ], 2, 'Think of the C++ syntax used for inheritance.', 'C++ uses a colon plus an access specifier: class Car : public Vehicle.', `class Vehicle {
public:
  void drive() { cout << "Driving"; }
};

class Car ______ Vehicle {
public:
  void honk() { cout << "Beep!"; }
};`),
    q('post-tough-2', 'Encapsulation', 'Fill in the missing keyword to protect data and access it safely.', [
        'public', 'private', 'protected', 'secure',
    ], 1, 'Encapsulation hides variables so they cannot be accessed directly.', 'private is the strictest access level; a public setter provides controlled access.', `class Account {
   ______:
      double balance;
   public:
      void setBalance(double b) { balance = b; }
};`),
    q('post-tough-3', 'Abstraction', 'Complete the abstract class definition.', [
        '= default', '= 1', '= 0', 'abstract',
    ], 2, 'A pure virtual function in C++ ends with = 0.', 'virtual void draw() = 0; makes Shape abstract.', `class Shape {
public:
   virtual void draw() ______;
};`),
    q('post-tough-4', 'Polymorphism', 'Complete both blanks to enable runtime polymorphism.', [
        'static in the base, static in the derived',
        'virtual in the base, override in the derived',
        'override in the base, virtual in the derived',
        'final in the base, abstract in the derived',
    ], 1, 'Runtime polymorphism in C++ requires two keywords: one in the base, one in the derived.', 'virtual enables dynamic dispatch in the base; override confirms it in the derived class.', `class Animal {
public:
   ______ void speak() { cout << "Animal"; }
};

class Dog : public Animal {
public:
   void speak() ______ { cout << "Bark"; }
};`),
    q('post-tough-5', 'Inheritance', 'Fill in the missing part to implement inheritance.', [
        'inherits', 'extends', ': public', 'implements',
    ], 2, 'C++ uses colon + access specifier, unlike Java.', 'class Car : public Vehicle.', `class Vehicle {
public:
  void drive() { cout << "Driving"; }
};

class Car ______ Vehicle {
public:
  void honk() { cout << "Beep!"; }
};`),
    q('post-tough-6', 'Inheritance', 'Complete the constructor call for the derived class.', [
        'Derived', 'Base', 'super', 'parent',
    ], 1, 'Which constructor is called when initializing a derived class?', 'A derived constructor initialises its base explicitly: Derived(int y) : Base(y) { }.', `class Base {
public:
   Base(int x) { cout << x; }
};
class Derived : public Base {
public:
   Derived(int y) : ______(y) { }
};`),
    q('post-tough-7', 'Encapsulation', 'Fill in the missing keyword for data protection.', [
        'public', 'private', 'protected', 'secure',
    ], 1, 'Which access specifier hides data completely?', 'private hides balance from everything outside the class.', `class Account {
   ______:
      double balance;
public:
   void setBalance(double b) { balance = b; }
};`),
    q('post-tough-8', 'Inheritance', 'Which access specifier allows controlled inheritance access here?', [
        'private', 'public', 'protected', 'inherits',
    ], 1, 'In C++, inheritance is written with colon (:) and an access specifier.', 'class CollegeStudent : public Student keeps protected grade accessible in the derived class.', `class Student {
protected:
   int grade;
public:
   void setGrade(int g) { grade = g; }
};

class CollegeStudent ______ Student {
public:
   void display() { cout << grade; }
};`),
];
const QUESTIONS = {
    'pretest-easy': PRETEST_EASY,
    'pretest-moderate': PRETEST_MODERATE,
    'pretest-challenging': PRETEST_CHALLENGING,
    'pretest-tough': PRETEST_TOUGH,
    'posttest-easy': POSTTEST_EASY,
    'posttest-moderate': POSTTEST_MODERATE,
    'posttest-challenging': POSTTEST_CHALLENGING,
    'posttest-tough': POSTTEST_TOUGH,
};
const AWARDS = {
    'pretest-easy': [
        { minScore: 5, badges: ['easy-concept-explorer', 'easy-starter-challenger'] },
        { minScore: 3, badges: ['easy-starter-challenger'] },
    ],
    'pretest-moderate': [
        { minScore: 5, badges: ['moderate-concept-challenger', 'moderate-resilient-learner', 'moderate-level-up-learner'] },
        { minScore: 3, badges: ['moderate-level-up-learner'] },
    ],
    'pretest-challenging': [
        { minScore: 5, badges: ['challenging-master-challenger', 'challenging-persistent-learner', 'challenging-on-the-climb'] },
        { minScore: 4, badges: ['challenging-persistent-learner'] },
        { minScore: 3, badges: ['challenging-on-the-climb'] },
    ],
    'pretest-tough': [
        { minScore: 5, badges: ['tough-oop-master', 'tough-persistent-challenger', 'tough-code-warrior', 'tough-advancing'] },
        { minScore: 4, badges: ['tough-code-warrior', 'tough-persistent-challenger'] },
        { minScore: 3, badges: ['tough-advancing'] },
    ],
    'posttest-easy': [
        { minScore: 8, badges: ['easy-code-apprentice', 'easy-oop-explorer', 'easy-foundation-builder', 'easy-beginner-explorer'] },
        { minScore: 7, badges: ['easy-oop-explorer'] },
        { minScore: 6, badges: ['easy-foundation-builder'] },
        { minScore: 5, badges: ['easy-beginner-explorer'] },
    ],
    'posttest-moderate': [
        { minScore: 8, badges: ['moderate-oop-challenger', 'moderate-code-warrior', 'moderate-problem-solver'] },
        { minScore: 7, badges: ['moderate-code-warrior', 'moderate-oop-challenger'] },
        { minScore: 6, badges: ['moderate-problem-solver'] },
    ],
    'posttest-challenging': [
        { minScore: 8, badges: ['challenging-code-gladiator', 'challenging-persistent-debugger', 'challenging-problem-solver'] },
        { minScore: 7, badges: ['challenging-persistent-debugger', 'challenging-code-gladiator'] },
        { minScore: 6, badges: ['challenging-problem-solver'] },
    ],
    'posttest-tough': [
        { minScore: 8, badges: ['tough-grandmaster-of-code', 'tough-iron-coder', 'tough-unbreakable-spirit'] },
        { minScore: 7, badges: ['tough-iron-coder', 'tough-unbreakable-spirit'] },
        { minScore: 6, badges: ['tough-unbreakable-spirit'] },
    ],
};
export const ASSESSMENTS = ASSESSMENT_RULES.map((cfg) => ({
    ...cfg,
    questions: QUESTIONS[cfg.key] ?? [],
    awards: AWARDS[cfg.key] ?? [],
}));
export function getAssessment(key) {
    return ASSESSMENTS.find((a) => a.key === key);
}
export function assessmentKey(kind, level) {
    return `${kind}-${level}`;
}
