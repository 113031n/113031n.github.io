var Example = Example || {};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const canvas = document.getElementById("world"),
    CATEGORY_GRABBABLE = 0x0001,
    CATEGORY_NOT = 0x0002;

const sounds = {
    click: new Audio("sounds/네르지마세요.mp3"),
    start: new Audio("sounds/쪼아요.mp3"),
    cr0: new Audio("sounds/우는소리.mp3"),
    cr1: new Audio("sounds/우는소리2.mp3")
};

function play(name) {
    sounds[name].currentTime = 0;
    sounds[name].play();
}
sounds.start.volume = 0.3
sounds.click.volume = 0.5
sounds.cr0.volume = 0.5
sounds.cr1.volume = 0.5
sounds.start.play()

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

Example.slingshot = function() {
    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Composites = Matter.Composites,
        Events = Matter.Events,
        Constraint = Matter.Constraint,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        Body = Matter.Body,
        Composite = Matter.Composite,
        Bodies = Matter.Bodies;

    // create engine
    var engine = Engine.create(),
        world = engine.world;

    // create renderer
    var render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: 1000,
            height: 800,
            wireframes : false,
        }
    });

    Render.run(render);
    // create runner
    var runner = Runner.create();
    Runner.run(runner, engine);

    // add bodies
    var ground = Bodies.rectangle(395, 600, 1500, 50, { isStatic: true, render: { fillStyle: '#060a19' } }),
        rockOptions = { 
            label: "bullet",
            density: 0.01,
            collisionFilter: {
                category: CATEGORY_GRABBABLE
            },
            render:{ sprite:{
                texture: '스핔이.webp',
                    xScale : 0.175,
                    yScale : 0.175
            }}},
        rock = Bodies.polygon(170, 450, 8, 20, rockOptions),
        anchor = { x: 170, y: 450 },
        elastic = Constraint.create({ 
            pointA: anchor, 
            bodyB: rock, 
            length: 0.01,
            damping: 0.01,
            stiffness: 0.05
        }),
        options = {sprite:{
            texture: '스핔이2.webp',
            xScale : 0.15,
            yScale : 0.15
        }};

    var pyramid = Composites.pyramid(350, 300, 9, 10, 0, 0, function(x, y) {
        const box = Bodies.rectangle(x, y, 50, 50, { 
            render: options,
            collisionFilter: {
                category: CATEGORY_NOT
            }
        });
        box.onClick = function () {
            Matter.Body.applyForce(this, this.position, { 
                x: 0, 
                y: -0.05       // 위쪽으로 힘
            });
            sounds.start.play()
        };
        box.cr = false
        box.cry = function (a){
            if (!this.cr) {
               this.cr = true
               const i = Math.floor(Math.random() * 2);
               sounds[`cr${i}`].play() 
            }
             this.render.sprite.texture = '스핔이.webp',

            // 2. 일정 시간 후 복구
            setTimeout(() => {
                 this.render.sprite.texture = '스핔이2.webp';
                 this.cr = false
            }, 1000);
        }
        return box
    });

    var ground2 = Bodies.rectangle(610, 250, 250, 20, { isStatic: true, render: { fillStyle: 'white' } });

    var pyramid2 = Composites.pyramid(485, 0, 5, 10, 0, 0, function(x, y) {
        const box = Bodies.rectangle(x, y, 50, 50, { 
            render: options,
            collisionFilter: {
                category: CATEGORY_NOT
            }
        });
        box.onClick = function () {
            Matter.Body.applyForce(this, this.position, { 
                x: 0, 
                y: -0.05       // 위쪽으로 힘
            });
            sounds.start.play()
        };
        box.cr = false
        box.cry = function (){
            if (!this.cr) {
               this.cr = true
               const i = Math.floor(Math.random() * 2);
               sounds[`cr${i}`].play() 
            }
             this.render.sprite.texture = '스핔이.webp',

            // 2. 일정 시간 후 복구
            setTimeout(() => {
                 this.render.sprite.texture = '스핔이2.webp';
                 this.cr = true
            }, 1000);
        }
        return box
    });

    Composite.add(engine.world, [ground, pyramid, ground2, pyramid2, rock, elastic]);

    const w = render.options.width;

    Events.on(engine, 'afterUpdate', async function() {
        if (mouseConstraint.mouse.button === -1 && (rock.position.x > 190 || rock.position.y < 430)) {
            // Limit maximum speed of current rock.
            if (Body.getSpeed(rock) > 45) {
                Body.setSpeed(rock, 45);
            }

            // Release current rock and add a new one.
            rock = Bodies.rectangle(170, 450, 65, 65, rockOptions);
            elastic.bodyB = rock;
            await delay(200)
            Composite.add(world, rock);
            
        }
        Composite.allBodies(world).forEach(body => {
        const bw = body.bounds.max.x - body.bounds.min.x;

        if (body.position.x < -bw) {
            if (body.label === "bullet") {
                Matter.World.remove(world, body);
            }else{
                Body.setPosition(body, { x: w + bw, y: body.position.y });
            }
        } else if (body.position.x > w + bw) {
            if (body.label === "bullet") {
                Matter.World.remove(world, body);
            }else{
            Body.setPosition(body, { x: -bw, y: body.position.y });
            }
        }
    });
    });
    Matter.Events.on(engine, "collisionActive", (event) => {
    event.pairs.forEach(pair => {
        const impulse = pair.collision.depth; // 충돌 깊이 (간단 대체)
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        if (impulse > 5) {
            if (bodyA.cry) bodyA.cry();
            if (bodyB.cry) bodyB.cry(true);
        }
        });
    });
    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            collisionFilter: {
                mask: CATEGORY_GRABBABLE
            },
            constraint: {
                stiffness: 0.2,
            }
        });

    Composite.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;
    
    Matter.Events.on(mouseConstraint, "mousedown", (event) => {
        const mousePos = event.mouse.position;

        // 클릭된 body 찾기
        const bodies = Matter.Query.point(Matter.Composite.allBodies(engine.world), mousePos);

        if (bodies.length > 0) {
            const body = bodies[0];

            // 함수 실행
            if (body.onClick) {
             body.onClick();
            }else if(body.label === "bullet"){
                sounds.click.play()
            }
        }
    });

    // fit the render viewport to the scene
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: 800, y: 600 }
    });

    // context for MatterTools.Demo
    return {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        stop: function() {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
        }
    };
};

Example.slingshot.title = 'Slingshot';
Example.slingshot.for = '>=0.14.2';

if (typeof module !== 'undefined') {
    module.exports = Example.slingshot;
}
