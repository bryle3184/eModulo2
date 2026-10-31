export const SECTIONS = [
    { slug: 'overview', title: 'Course Overview', accent: 'blue' },
    { slug: 'inheritance', title: 'Inheritance', badge: 'easy-code-reuser', accent: 'blue' },
    { slug: 'encapsulation', title: 'Encapsulation', badge: 'easy-guardian-of-code', accent: 'emerald' },
    { slug: 'abstraction', title: 'Abstraction', badge: 'easy-abstract-thinker', accent: 'violet' },
    { slug: 'polymorphism', title: 'Polymorphism', badge: 'easy-polymorph-pioneer', accent: 'amber' },
];
const INHERITANCE_CODE = `#include <iostream>
using namespace std;

class Vehicle {
public:
  void start() {
    cout << "Vehicle starting..." << endl;
  }
};

class Car : public Vehicle { // Inherits from Vehicle
public:
  void drive() {
    cout << "Car is driving..." << endl;
  }
};

int main() {
  Car myCar;
  myCar.start(); // Inherited
  myCar.drive(); // Car-specific
  return 0;
}`;
const ENCAPSULATION_CODE = `#include <iostream>
using namespace std;

class Account {
private:
  double balance; // hidden data

public:
  // setter method
  void setBalance(double b) {
    if (b >= 0) balance = b; // validation
  }

  // getter method
  double getBalance() {
    return balance;
  }
};

int main() {
  Account myAcc;
  myAcc.setBalance(5000); // access via method
  cout << "Balance: " << myAcc.getBalance() << endl;
  return 0;
}`;
const ABSTRACTION_CODE = `#include <iostream>
using namespace std;

// Abstract class
class Shape {
public:
  virtual void draw() = 0; // Pure virtual function
};

class Circle : public Shape {
public:
  void draw() {
    cout << "Drawing a Circle" << endl;
  }
};

int main() {
  Shape* s = new Circle();
  s->draw(); // Calls Circle's implementation
  delete s;
  return 0;
}`;
const POLYMORPHISM_CODE = `#include <iostream>
using namespace std;

class Animal {
public:
  virtual void makeSound() {
    cout << "Some generic animal sound" << endl;
  }
};

class Dog : public Animal {
public:
  void makeSound() override {
    cout << "Barking..." << endl;
  }
};

class Cat : public Animal {
public:
  void makeSound() override {
    cout << "Meowing..." << endl;
  }
};

int main() {
  Animal* a1 = new Dog();
  Animal* a2 = new Cat();

  a1->makeSound(); // Calls Dog's version
  a2->makeSound(); // Calls Cat's version

  delete a1;
  delete a2;
  return 0;
}`;
export const LESSONS = [
    {
        slug: 'course-introduction',
        order: 1,
        section: 'Course Overview',
        sectionSlug: 'overview',
        title: 'Course introduction',
        minutes: 7,
        concept: 'Foundations',
        objectives: [
            'Describe what object-oriented programming is and why it exists.',
            'Name the four OOP pillars covered by this module.',
            'Explain how lessons, activities, and assessments fit together.',
        ],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'Welcome to eMódulo. This module introduces Object-Oriented Programming (OOP) in C++ — a way of designing software around objects that bundle data with the operations that act on that data.' },
            { type: 'h', text: 'Why object-oriented programming?' },
            { type: 'p', text: 'Procedural programs tend to grow into long lists of functions that all reach into the same shared data. As a program grows, it becomes hard to know which function is allowed to change what. OOP gives us a way to package data with the behaviour that owns it, so the rest of the program cannot accidentally break it.' },
            { type: 'list', items: [
                    'Classes and objects let you model real-world entities directly in code.',
                    'Encapsulation protects an object’s internal state.',
                    'Abstraction exposes only what a caller needs to know.',
                    'Inheritance reuses behaviour instead of copying it.',
                    'Polymorphism lets one interface stand for many implementations.',
                ] },
            { type: 'h', text: 'The four pillars you will master' },
            { type: 'p', text: 'Every section of this module is built around one pillar. You will read the concept, study a complete C++ example, predict its output, and then prove your understanding in a drag-and-drop coding activity.' },
            { type: 'list', items: [
                    'Inheritance — a derived class acquires the attributes and behaviours of a base class.',
                    'Encapsulation — bundle data and methods, then control access to the data.',
                    'Abstraction — hide complex implementation behind a simple interface.',
                    'Polymorphism — one interface, many behaviours.',
                ] },
            { type: 'h', text: 'How this course works' },
            { type: 'p', text: 'Choose a difficulty level before you begin. Your level controls how your assessments behave: whether the clock runs, how many lives you have, and whether hints are free. Lessons and activities can be revisited at any time, and your progress is saved as you go.' },
            { type: 'note', title: 'Before you start', items: [
                    'Read each lesson in order — later examples build on the earlier syntax.',
                    'Try to predict the output before you reveal it.',
                    'Activities require every blank to be correct, but you can retry.',
                    'Your certificate is unlocked only when the required badges and module completion are done.',
                ] },
        ],
    },
    {
        slug: 'motivational-quote',
        order: 2,
        section: 'Course Overview',
        sectionSlug: 'overview',
        title: 'Motivational quote',
        minutes: 1,
        concept: 'Foundations',
        completion: 'button',
        blocks: [
            { type: 'quote', text: 'Every expert was once a beginner who refused to give up.' },
            { type: 'p', text: 'Programming is a skill built through repetition and mistakes, not through talent alone. If a concept does not click today, come back tomorrow — the activity will still be here, and retrying is part of the design.' },
        ],
    },
    {
        slug: 'course-objectives',
        order: 3,
        section: 'Course Overview',
        sectionSlug: 'overview',
        title: 'Course objectives',
        minutes: 3,
        concept: 'Foundations',
        objectives: [
            'Map each course objective to the activities that assess it.',
        ],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'By the end of this module you should be able to do all of the following.' },
            { type: 'objectives', items: [
                    'CO1. Define the four OOP concepts — Abstraction, Encapsulation, Inheritance, and Polymorphism.',
                    'CO2. Apply the four OOP concepts by writing basic C++ class structures, member functions, and simple program implementations.',
                    'CO3. Analyze C++ code to identify correct and incorrect uses of Abstraction, Encapsulation, Inheritance, and Polymorphism.',
                    'CO4. Evaluate different C++ program designs by comparing how effectively they implement the four OOP concepts.',
                    'CO5. Create a functional C++ program that integrates all four OOP concepts to solve a defined programming task.',
                ] },
            { type: 'callout', tone: 'info', title: 'How your mastery is measured',
                text: 'Recall and definitions are covered by the pre-test. Application and analysis are covered by the section activities and the post-test, which asks you to trace, debug, and predict the behaviour of real C++ programs.' },
        ],
    },
    {
        slug: 'what-is-inheritance',
        order: 4,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'What is Inheritance?',
        minutes: 2,
        concept: 'Inheritance',
        objectives: ['Define inheritance in your own words.', 'Identify base and derived classes.'],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'In object-oriented programming (OOP), inheritance is a process of one class (the derived class) inheriting properties and behaviors of an existing class (the base class). This enhances the concept of reusing code through the inheritance of the shared attributes and functions in derived classes instead of copying them.' },
            { type: 'p', text: 'The derived class can then inherit or alter the inherited characteristics, giving rise to a specialized version of the base class.' },
            { type: 'callout', tone: 'info', title: 'Vocabulary',
                text: 'Base class = parent = superclass. Derived class = child = subclass. A Car is a Vehicle; Vehicle is the base class, Car is the derived class.' },
        ],
    },
    {
        slug: 'why-inheritance',
        order: 5,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'Why is Inheritance important?',
        minutes: 2,
        concept: 'Inheritance',
        objectives: ['Explain the benefits of code reuse.', 'Recognise a real-world inheritance hierarchy.'],
        completion: 'button',
        blocks: [
            { type: 'list', items: [
                    'Promotes code reusability — no need to repeat code.',
                    'Makes programs organized and maintainable.',
                    'Establishes hierarchy between general and specific classes.',
                ] },
            { type: 'h', text: 'Real-world example' },
            { type: 'list', items: [
                    'Base Class: Vehicle → can start and stop.',
                    'Derived Class: Car → inherits start/stop and adds driving functionality.',
                ] },
            { type: 'p', text: 'Because Car inherits from Vehicle, a bug fix in Vehicle::start() automatically reaches every vehicle type. Without inheritance the same logic would be copied into Car, Truck, and Motorcycle — three places to keep in sync.' },
        ],
    },
    {
        slug: 'inheritance-cpp-example',
        order: 6,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'C++ example',
        minutes: 3,
        concept: 'Inheritance',
        completion: 'button',
        blocks: [
            { type: 'code', code: INHERITANCE_CODE, caption: 'Vehicle / Car — public inheritance in C++' },
            { type: 'note', title: 'Reading the code', items: [
                    'class Car : public Vehicle establishes public inheritance.',
                    'Car has no start() of its own, so myCar.start() calls the inherited Vehicle::start().',
                    'drive() belongs only to Car — the base class knows nothing about it.',
                ] },
        ],
    },
    {
        slug: 'inheritance-output',
        order: 7,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'Output & key points to remember',
        minutes: 3,
        concept: 'Inheritance',
        completion: 'button',
        blocks: [
            { type: 'output', lines: ['Vehicle starting...', 'Car is driving...'] },
            { type: 'keypoints', items: [
                    'Use : to show inheritance (class Car : public Vehicle).',
                    'Derived classes reuse methods of base classes.',
                    'Derived classes can add their own features.',
                ] },
            { type: 'callout', tone: 'warn', title: 'Common mistake',
                text: 'Writing class Car : Vehicle without an access specifier defaults to private inheritance in C++, which is usually not what you want. Write : public explicitly.' },
        ],
    },
    {
        slug: 'inheritance-activity',
        order: 8,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'Activity: build the inheritance program',
        minutes: 10,
        concept: 'Inheritance',
        completion: 'activity',
        activitySlug: 'inheritance',
        blocks: [
            { type: 'p', text: 'Time to write it yourself. Complete the missing inheritance syntax and the inherited method call. Every blank must be correct before the activity is marked complete.' },
            { type: 'note', title: 'Activity rules', items: [
                    'Easy: no timer, no lives, unlimited free hints.',
                    'Moderate: 8-minute timer, 5 lives, hints cost 1 point each.',
                    'Challenging: 5-minute timer, 3 lives, one hint for the whole activity.',
                    'Tough: 4-minute timer, 2 lives, one costly hint.',
                ] },
        ],
    },
    {
        slug: 'inheritance-completion',
        order: 9,
        section: 'Inheritance',
        sectionSlug: 'inheritance',
        title: 'Completion of Inheritance',
        minutes: 1,
        concept: 'Inheritance',
        completion: 'button',
        blocks: [
            { type: 'h', text: 'Congratulations on completing Inheritance!' },
            { type: 'p', text: 'You can now explain how a derived class reuses a base class, and you have written the syntax yourself. Finish every lesson in this section to unlock the Code reuser badge.' },
            { type: 'keypoints', items: [
                    'A derived class inherits attributes and behaviours from its base class.',
                    ': public is the standard inheritance syntax in C++.',
                    'Inheritance removes duplication and creates a clear hierarchy.',
                ] },
        ],
    },
    {
        slug: 'encapsulation-quote',
        order: 10,
        section: 'Encapsulation',
        sectionSlug: 'encapsulation',
        title: 'Motivational quote',
        minutes: 2,
        concept: 'Encapsulation',
        completion: 'button',
        blocks: [
            { type: 'quote', text: 'Focus on what matters; hide what doesn’t.' },
            { type: 'p', text: 'That line is almost a definition of encapsulation. Good classes expose what callers need and keep everything else private.' },
        ],
    },
    {
        slug: 'what-is-encapsulation',
        order: 11,
        section: 'Encapsulation',
        sectionSlug: 'encapsulation',
        title: 'What is Encapsulation and why is it important?',
        minutes: 2,
        concept: 'Encapsulation',
        objectives: ['Define encapsulation.', 'Explain how getters and setters protect data integrity.'],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'Encapsulation in OOP is the process of bundling data (attributes) and the methods (functions) that operate on that data into a single unit, typically a class. It involves hiding the internal state of an object and controlling access to it through public methods (like getters and setters), thereby protecting the data from unauthorized modification and ensuring data integrity.' },
            { type: 'h', text: 'Why is Encapsulation important?' },
            { type: 'list', items: [
                    'Provides data protection.',
                    'Prevents accidental changes to variables.',
                    'Makes programs more secure and reliable.',
                ] },
            { type: 'p', text: 'Private data can only change through the class’s own methods, so validation rules live in one place. If a balance may never be negative, setBalance() can reject invalid input instead of trusting every caller.' },
        ],
    },
    {
        slug: 'encapsulation-cpp-example',
        order: 12,
        section: 'Encapsulation',
        sectionSlug: 'encapsulation',
        title: 'C++ example',
        minutes: 5,
        concept: 'Encapsulation',
        completion: 'button',
        blocks: [
            { type: 'code', code: ENCAPSULATION_CODE, caption: 'Account — private state with a validating setter' },
            { type: 'output', lines: ['Balance: 5000'] },
            { type: 'keypoints', items: [
                    'private hides variables inside the class.',
                    'Use getter and setter methods to control access.',
                    'Encapsulation protects data and ensures safe interaction with objects.',
                ] },
        ],
    },
    {
        slug: 'encapsulation-activity',
        order: 13,
        section: 'Encapsulation',
        sectionSlug: 'encapsulation',
        title: 'Activity: protect the data',
        minutes: 10,
        concept: 'Encapsulation',
        completion: 'activity',
        activitySlug: 'encapsulation',
        blocks: [
            { type: 'p', text: 'Complete a Student class so its age is hidden and only reachable through methods. Choose the access specifier and the reader method carefully.' },
        ],
    },
    {
        slug: 'encapsulation-completion',
        order: 14,
        section: 'Encapsulation',
        sectionSlug: 'encapsulation',
        title: 'Completion of Encapsulation',
        minutes: 1,
        concept: 'Encapsulation',
        completion: 'button',
        blocks: [
            { type: 'h', text: 'Congratulations on completing Encapsulation!' },
            { type: 'p', text: 'Your classes can now protect their own invariants. Finish every lesson in this section to unlock the Guardian of Code badge.' },
            { type: 'keypoints', items: [
                    'Encapsulation = data hiding + controlled access.',
                    'private fields, public methods.',
                    'Validation belongs inside the setter, not in every caller.',
                ] },
        ],
    },
    {
        slug: 'abstraction-quote',
        order: 15,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'Motivational quote',
        minutes: 2,
        concept: 'Abstraction',
        completion: 'button',
        blocks: [
            { type: 'quote', text: 'Focus on what matters; hide what doesn’t.' },
            { type: 'p', text: 'This time, think about interfaces rather than data. A driver does not need to know how an engine works to drive a car — and a caller does not need to know how draw() is implemented.' },
        ],
    },
    {
        slug: 'what-is-abstraction',
        order: 16,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'What is Abstraction?',
        minutes: 2,
        concept: 'Abstraction',
        objectives: ['Define abstraction and distinguish it from encapsulation.'],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'In object-oriented programming (OOP), abstraction is the process of hiding complex internal implementation details and displaying only the essential, relevant features of an object to the user or other programs. It simplifies complex systems by showing only the important functionality, reducing complexity and increasing efficiency.' },
            { type: 'callout', tone: 'info', title: 'Abstraction vs encapsulation',
                text: 'Encapsulation hides data. Abstraction hides implementation. Encapsulation answers “who may touch this?”, abstraction answers “what does the caller actually need to know?”' },
        ],
    },
    {
        slug: 'why-abstraction',
        order: 17,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'Why is Abstraction important?',
        minutes: 2,
        concept: 'Abstraction',
        objectives: ['Explain how abstraction reduces complexity.', 'Recognise an abstract interface in C++.'],
        completion: 'button',
        blocks: [
            { type: 'list', items: [
                    'Reduces complexity by hiding details. (CO4)',
                    'Focuses only on what is needed. (CO6)',
                    'Makes code easier to maintain and extend. (CO8)',
                ] },
            { type: 'p', text: 'In C++ abstraction is usually expressed with abstract classes and pure virtual functions. The base class promises that draw() exists; each concrete shape decides how it is drawn. Adding a Triangle later does not change a single line of code that already uses Shape*.' },
        ],
    },
    {
        slug: 'abstraction-cpp-example',
        order: 18,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'C++ example',
        minutes: 5,
        concept: 'Abstraction',
        completion: 'button',
        blocks: [
            { type: 'code', code: ABSTRACTION_CODE, caption: 'Shape — an abstract class with a pure virtual function' },
            { type: 'output', lines: ['Drawing a Circle'] },
            { type: 'keypoints', items: [
                    'Abstraction in C++ is achieved using abstract classes and pure virtual functions.',
                    'Declaring a function with = 0 makes it pure virtual (no implementation in the base class).',
                    'Derived classes must implement the abstract method.',
                ] },
        ],
    },
    {
        slug: 'abstraction-activity',
        order: 19,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'Activity: make the class abstract',
        minutes: 10,
        concept: 'Abstraction',
        completion: 'activity',
        activitySlug: 'abstraction',
        blocks: [
            { type: 'p', text: 'Complete the pure virtual declaration that forces every derived class to provide makeSound().' },
        ],
    },
    {
        slug: 'abstraction-completion',
        order: 20,
        section: 'Abstraction',
        sectionSlug: 'abstraction',
        title: 'Completion of Abstraction',
        minutes: 1,
        concept: 'Abstraction',
        completion: 'button',
        blocks: [
            { type: 'h', text: 'Congratulations on completing Abstraction!' },
            { type: 'p', text: 'You can now design interfaces that hide their implementation. Finish every lesson in this section to unlock the Abstract Thinker badge.' },
            { type: 'keypoints', items: [
                    'A pure virtual function is declared with = 0.',
                    'A class containing one becomes abstract and cannot be instantiated.',
                    'Derived classes must implement inherited pure virtual functions.',
                ] },
        ],
    },
    {
        slug: 'polymorphism-quote',
        order: 21,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'Motivational quote',
        minutes: 1,
        concept: 'Polymorphism',
        completion: 'button',
        blocks: [
            { type: 'quote', text: 'Flexibility is the key to stability.' },
            { type: 'p', text: 'Polymorphism is flexibility in code: one pointer type, many behaviours, and no rewrite when a new type arrives.' },
        ],
    },
    {
        slug: 'what-is-polymorphism',
        order: 22,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'What is Polymorphism?',
        minutes: 2,
        concept: 'Polymorphism',
        objectives: ['Define polymorphism.', 'Explain dynamic binding through a base-class pointer.'],
        completion: 'button',
        blocks: [
            { type: 'p', text: 'Polymorphism in Object-Oriented Programming (OOP) is the ability of objects to take on multiple forms or behaviors, allowing different objects to be treated as instances of a common parent class while retaining their unique implementations. This core OOP concept enables code to be more flexible, reusable, and maintainable by providing a single interface to diverse underlying classes, making programs adaptable to new situations and easier to manage.' },
        ],
    },
    {
        slug: 'types-of-polymorphism',
        order: 23,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'Types of polymorphism',
        minutes: 2,
        concept: 'Polymorphism',
        objectives: ['Distinguish compile-time from run-time polymorphism.'],
        completion: 'button',
        blocks: [
            { type: 'list', items: [
                    'Compile-time (static) → function overloading, operator overloading.',
                    'Run-time (dynamic) → achieved using virtual functions.',
                ] },
            { type: 'p', text: 'Overloading is resolved by the compiler from the argument types at the call site. Overriding is resolved at run time from the actual type of the object behind the pointer — but only if the base function is declared virtual.' },
            { type: 'callout', tone: 'warn', title: 'It only works through references or pointers',
                text: 'Assigning a derived object to a base object by value slices the derived part off. Polymorphism requires a base-class pointer or reference.' },
        ],
    },
    {
        slug: 'polymorphism-cpp-example',
        order: 24,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'C++ example',
        minutes: 2,
        concept: 'Polymorphism',
        completion: 'button',
        blocks: [
            { type: 'code', code: POLYMORPHISM_CODE, caption: 'Animal, Dog and Cat — runtime polymorphism with virtual functions' },
            { type: 'output', lines: ['Barking...', 'Meowing...'] },
            { type: 'keypoints', items: [
                    'Polymorphism = one interface, multiple implementations.',
                    'Achieved in C++ by virtual functions (dynamic binding).',
                    'Increases flexibility and reusability of code.',
                ] },
        ],
    },
    {
        slug: 'polymorphism-activity',
        order: 25,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'Activity: enable runtime polymorphism',
        minutes: 10,
        concept: 'Polymorphism',
        completion: 'activity',
        activitySlug: 'polymorphism',
        blocks: [
            { type: 'p', text: 'Add the keyword that enables dynamic dispatch and the one that confirms overriding. Both blanks must be correct.' },
        ],
    },
    {
        slug: 'polymorphism-completion',
        order: 26,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'Completion of Polymorphism',
        minutes: 1,
        concept: 'Polymorphism',
        completion: 'button',
        blocks: [
            { type: 'h', text: 'Congratulations on completing Polymorphism!' },
            { type: 'p', text: 'You have now covered all four pillars of OOP. Finish every lesson in this section to unlock the Polymorph Pioneer badge, then take the post-test to complete the module.' },
            { type: 'keypoints', items: [
                    'virtual enables run-time dispatch.',
                    'override lets the compiler verify the override.',
                    'A base pointer or reference is required for polymorphic behaviour.',
                ] },
        ],
    },
    {
        slug: 'post-test',
        order: 27,
        section: 'Polymorphism',
        sectionSlug: 'polymorphism',
        title: 'Post-test',
        minutes: 10,
        concept: 'Foundations',
        objectives: ['Demonstrate mastery of all four OOP pillars.'],
        completion: 'posttest',
        blocks: [
            { type: 'p', text: 'The post-test closes the module. It covers all four pillars with 8 questions — two per concept — and it uses the rules of the difficulty level you selected.' },
            { type: 'note', title: 'Before you begin', items: [
                    'Easy: untimed, no lives, free hints. 8 questions.',
                    'Moderate: 8 minutes, 5 lives, hints cost 1 point each. 8 questions.',
                    'Challenging: 5 minutes total, 30 seconds per question, 3 lives, one costly hint. 8 questions.',
                    'Tough: 4 minutes total, 30 seconds per question, 2 lives, one costly hint. 8 questions.',
                ] },
            { type: 'p', text: 'Passing the post-test completes the module. Combined with your activities and pre-test, it unlocks the badge set required for your certificate.' },
        ],
    },
];
export function getLesson(slug) {
    return LESSONS.find((l) => l.slug === slug);
}
export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
