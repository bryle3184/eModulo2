const LEVEL_ACTIVITY_RULES = {
    easy: { timerSeconds: null, lives: null, hintMode: 'unlimited', hintPenalty: 0 },
    moderate: { timerSeconds: 480, lives: 5, hintMode: 'unlimited', hintPenalty: 1 },
    challenging: { timerSeconds: 300, lives: 3, hintMode: 'single', hintPenalty: 1 },
    tough: { timerSeconds: 240, lives: 2, hintMode: 'single', hintPenalty: 1 },
};
function activity(level, concept, slug, brief, code, blocks, answers, hints, badge) {
    const rules = LEVEL_ACTIVITY_RULES[level];
    return {
        key: `${level}-${slug}`,
        level,
        concept,
        title: `${concept} activity`,
        brief,
        instructions: [
            'Drag the correct syntax blocks into the blanks to complete the program.',
            level === 'easy'
                ? 'Hints are available with no penalty at the Easy level.'
                : rules.hintMode === 'single'
                    ? 'Only 1 hint is available for the whole activity, and using it deducts 1 point.'
                    : 'Hints are available, but each one deducts 1 point.',
            level === 'easy' ? 'No timer — take your time to understand each question.' : 'The clock starts when you begin. Manage your time.',
            rules.lives ? `You have ${rules.lives} lives; each wrong submission costs one.` : 'No lives — retry as often as you need.',
            'You must complete every blank correctly to finish the activity and earn its badge.',
        ],
        code,
        blocks,
        answers,
        hints,
        badge,
        ...rules,
    };
}
export const ACTIVITIES = [
    // ── Easy ───────────────────────────────────────────────────────────────────
    activity('easy', 'Inheritance', 'inheritance', 'Drag the correct syntax blocks into the blanks to complete the inheritance program.', `#include <iostream>
using namespace std;

class Vehicle {
public:
  void start() {
    cout << "Vehicle starting..." << endl;
  }
};

class Car {{1}} Vehicle {
public:
  void drive() {
    cout << "Car is driving..." << endl;
  }
};

int main() {
  Car myCar;
  myCar.{{2}}();
  myCar.drive();
  return 0;
}`, [': public', ': private', 'start', 'drive'], [': public', 'start'], [
        'C++ attaches a base class with a colon followed by an access specifier.',
        'Which method was defined inside Vehicle to make the car start?',
    ], 'easy-junior-inheritor'),
    activity('easy', 'Encapsulation', 'encapsulation', 'Drag the correct syntax blocks into the blanks to complete the encapsulation code.', `class Student {
{{1}}:
  int age; // hidden data

public:
  void setAge(int a) { age = a; } // setter
  int {{2}}() { return age; }     // controlled read
};`, ['private', 'protected', 'getter', 'getAge'], ['private', 'getAge'], [
        'Which access specifier hides a member from everything outside the class?',
        'If setAge() is a setter, what do we call the method that retrieves the value?',
    ], 'easy-data-protector'),
    activity('easy', 'Abstraction', 'abstraction', 'Drag the correct syntax blocks into the blanks to complete the abstraction example.', `class Animal {
public:
  virtual void makeSound() = {{1}};
};

class Dog {{2}} Animal {
public:
  void makeSound() {
    cout << "Barking..." << endl;
  }
};`, ['0', 'null', ': public', ': private'], ['0', ': public'], [
        'A pure virtual function in C++ is declared by assigning it the value ______. It makes the class abstract.',
        'How does Dog declare that it inherits from Animal?',
    ], 'easy-essential-thinker'),
    activity('easy', 'Polymorphism', 'polymorphism', 'Drag and drop the correct keywords to enable polymorphism.', `class Shape {
public:
  {{1}} void draw() {
    cout << "Drawing a Shape" << endl;
  }
};

class Circle {{2}} Shape {
public:
  void draw() override {
    cout << "Drawing a Circle" << endl;
  }
};`, ['virtual', 'abstract', 'protected', ': public'], ['virtual', ': public'], [
        'To enable runtime polymorphism, the base class method must be marked ______ so C++ looks at the real object type at runtime.',
        'Circle must declare its base class — which syntax does that?',
    ], 'easy-rapid-coder'),
    // ── Moderate ───────────────────────────────────────────────────────────────
    activity('moderate', 'Inheritance', 'inheritance', 'Complete the inheritance relationship and the inherited method call.', `#include <iostream>
using namespace std;

class Vehicle {
public:
  void start() { cout << "Vehicle starting..." << endl; }
};

class Car {{1}} Vehicle {
public:
  void drive() { cout << "Car is driving..." << endl; }
};

int main() {
  Car myCar;
  myCar.{{2}}();
  myCar.drive();
}`, [': public', ': private', 'start', 'extends'], [': public', 'start'], [
        'In C++, inheritance uses a colon + access specifier.',
        'Which base class method do we call to start the car?',
    ], 'moderate-bridge-builder'),
    activity('moderate', 'Encapsulation', 'encapsulation', 'Protect the student’s data using encapsulation.', `class Student {
  {{1}}: // hidden data

     int age;

public:
     void setAge(int a) { age = a; }
     int {{2}}() { return age; }
};`, ['private', 'public', 'getAge', 'setAge'], ['private', 'getAge'], [
        'Encapsulation hides data with private and provides methods for controlled access.',
        'The setter writes the value; which method name reads it back?',
    ], 'moderate-data-guardian'),
    activity('moderate', 'Abstraction', 'abstraction', 'Make this class abstract.', `class Shape {
public:
   virtual void draw() {{1}}; // pure virtual
};

class Circle : public Shape {
public:
   void draw() { cout << "Circle" << endl; }
};`, ['= 0;', 'virtual;', 'abstract;', '{}'], ['= 0;'], ['In C++, a pure virtual function is declared by assigning it ______.'], 'moderate-visionary-designer'),
    activity('moderate', 'Polymorphism', 'polymorphism', 'Enable runtime polymorphism for speak().', `class Animal {
public:
   {{1}} void speak() { cout << "Animal"; }
};

class Dog : public Animal {
public:
   void speak() {{2}} { cout << "Bark"; }
};`, ['virtual', 'override', 'static', 'friend'], ['virtual', 'override'], [
        'Which keyword makes a base class function dynamically dispatched?',
        'Which keyword tells the compiler the derived function intentionally overrides a virtual function?',
    ], 'moderate-shape-shifter'),
    // ── Challenging ────────────────────────────────────────────────────────────
    activity('challenging', 'Inheritance', 'inheritance', 'Fill in the missing syntax that allows class inheritance.', `class Person {
public:
  void walk() { cout << "Walking..."; }
};

class Student {{1}} Person {
public:
  void study() { cout << "Studying..."; }
};`, [': public', ': private', 'extends', 'inherits'], [': public'], ['In C++, inheritance uses colon (:) + access specifier.'], 'challenging-syntax-slayer'),
    activity('challenging', 'Encapsulation', 'encapsulation', 'Fill in the blanks to apply encapsulation in the Account class.', `class Account {
  {{1}}: // hide the balance
     double balance;

public:
     void setBalance(double b) { balance = b; } // setter
     double {{2}}() { return balance; }          // controlled read
};`, ['private', 'public', 'getBalance', 'setBalance'], ['private', 'getBalance'], [
        'Encapsulation hides data with an access specifier and exposes controlled access.',
        'The reader mirrors the name of the hidden field, prefixed with get.',
    ], 'challenging-logic-breaker'),
    activity('challenging', 'Abstraction', 'abstraction', 'Make Shape an abstract class by completing the pure virtual function.', `class Shape {
public:
  virtual void draw() {{1}};
};

class Circle : public Shape {
public:
  void draw() { cout << "Circle"; }
};`, ['= 0', '= null', 'abstract', '{}'], ['= 0'], ['In C++, pure virtual functions are written with = 0.'], 'challenging-bug-hunter'),
    activity('challenging', 'Polymorphism', 'polymorphism', 'Enable runtime polymorphism for the speak() function.', `class Animal {
public:
   {{1}} void speak() { cout << "Generic Animal"; }
};

class Dog : public Animal {
public:
   void speak() {{2}} { cout << "Bark!"; }
};`, ['virtual', 'override', 'static', 'final'], ['virtual', 'override'], [
        'The base class needs the keyword that enables dynamic binding.',
        'The derived class needs the keyword that confirms it is overriding.',
    ], 'challenging-code-survivor'),
    // ── Tough ──────────────────────────────────────────────────────────────────
    activity('tough', 'Inheritance', 'inheritance', 'Fix the missing inheritance and the method call.', `class Device {
public:
   void powerOn() { cout << "Powering on..."; }
};

class Phone {{1}} Device {
public:
   void call() { cout << "Calling..."; }
};

int main() {
   Phone myPhone;
   myPhone.{{2}}();
   myPhone.call();
}`, [': public', ': private', 'powerOn', 'call'], [': public', 'powerOn'], [
        'Think of colon + access specifier for inheritance.',
        'Which method is inherited from Device and powers the phone on?',
    ], 'tough-code-conqueror'),
    activity('tough', 'Encapsulation', 'encapsulation', 'Secure the data with encapsulation.', `class BankAccount {
  {{1}}: // strictest access
     double balance;

public:
   void deposit(double amount) { balance += amount; }
   double {{2}}() { return balance; }
};`, ['private', 'public', 'getBalance', 'setBalance'], ['private', 'getBalance'], [
        'Encapsulation hides variables with the strictest access level.',
        'Which method lets a caller read the balance safely?',
    ], 'tough-guardian-of-syntax'),
    activity('tough', 'Abstraction', 'abstraction', 'Force derived classes to implement their own method.', `class Shape {
public:
   virtual void draw() {{1}};
};

class Triangle : public Shape {
public:
   void draw() { cout << "Triangle"; }
};`, ['= 0', '= 1', 'abstract', '= default'], ['= 0'], ['Pure virtual functions in C++ are declared with = 0.'], 'tough-logic-seeker'),
    activity('tough', 'Polymorphism', 'polymorphism', 'Enable polymorphism and correct overriding.', `class Animal {
public:
   {{1}} void speak() { cout << "Generic animal"; }
};

class Cat : public Animal {
public:
   void speak() {{2}} { cout << "Meow"; }
};`, ['virtual', 'override', 'static', 'abstract'], ['virtual', 'override'], [
        'One keyword in the base enables dynamic binding.',
        'Another keyword in the derived class confirms overriding.',
    ], 'tough-summit-climber'),
];
export function getActivity(key) {
    return ACTIVITIES.find((a) => a.key === key);
}
export function activitiesForLevel(level) {
    return ACTIVITIES.filter((a) => a.level === level);
}
