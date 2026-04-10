var Example = Example || {};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const canvas = document.getElementById("world");

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
    var ground = Bodies.rectangle(395, 600, 815, 50, { isStatic: true, render: { fillStyle: '#060a19' } }),
        rockOptions = { 
            density: 0.004,
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
            texture: '스핔이.webp',
            xScale : 0.15,
            yScale : 0.15
        }};

    var pyramid = Composites.pyramid(350, 300, 9, 10, 0, 0, function(x, y) {
        const box = Bodies.rectangle(x, y, 50, 50, { 
            render: options
        });
        box.onClick = function () {
            Matter.Body.applyForce(this, this.position, { 
                x: 0, 
                y: -0.05       // 위쪽으로 힘
            });
        };
        return box
    });

    var ground2 = Bodies.rectangle(610, 250, 200, 20, { isStatic: true, render: { fillStyle: 'white' } });

    var pyramid2 = Composites.pyramid(550, 0, 5, 10, 0, 0, function(x, y) {
        return Bodies.rectangle(x, y, 25, 40);
    });

    Composite.add(engine.world, [ground, pyramid, ground2, pyramid2, rock, elastic]);

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
            Composite.add(engine.world, rock);
            
        }
    });

    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
            }
        });

    Composite.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;

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
