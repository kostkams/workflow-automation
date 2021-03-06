import {expect} from 'chai';
import {it, describe} from "mocha";
import {
    Workflow,
    WorkflowState,
    Start,
    End,
    Transition,
    SimpleState,
    ParallelState,
    CollectState
} from "../index";
import * as fs from "fs";

describe('Workflow', () => {

    var createWorkflow = function (start: Start, end: End, transitions: Transition[]) {
        var workflow = new Workflow();

        workflow.namespace = 'Test 1';
        workflow.transitions = transitions;

        return workflow;
    };

    it('should have workflow class', () => {
        var workflow = new Workflow();
        expect(workflow).to.not.be.undefined;
    });

    it('should check init()', () => {
        var workflow = new Workflow();
        expect(() => workflow.init(null)).to.throw('namespace must not be null');

        workflow.namespace = 'Test 2 4';
        expect(() => workflow.init(null)).to.throw('transitions must have');

        workflow.transitions = [];
        expect(() => workflow.init(null)).to.throw('transitions must have');


        workflow.transitions = [new Transition('start to end')];
        expect(() => workflow.init(null)).to.throw('workflowObject must not be null');

        var workflowObject = {};
        expect(() => workflow.init(workflowObject)).to.not.throw();

        expect(workflowObject).to.have.property(workflow.namespace);

    });

    it('should go from start to end', () => {
        var start = new Start('start');
        var end = new End('end');


        var transition = new Transition('start to end');
        transition.inState = start;
        transition.outState = end;

        var workflow = createWorkflow(start, end, [transition]);

        var workflowObject = {};
        workflow.init(workflowObject);

        expect((<WorkflowState>workflowObject[workflow.namespace]).currentStates.length).to.be.equal(1);

        workflow.next();
        workflow.next();

        expect(workflow.isFinished()).to.be.true;
    });

    it('should go from start to state1 to end', () => {
        var start = new Start('start');
        var end = new End('end');

        var simpleState = new SimpleState('state1');

        var transition1 = new Transition('start to end');
        transition1.inState = start;
        transition1.outState = simpleState;

        var transition2 = new Transition('start to end');
        transition2.inState = simpleState;
        transition2.outState = end;

        var workflow = createWorkflow(start, end, [transition1, transition2]);

        var workflowObject = {};
        workflow.init(workflowObject);

        workflow.next();
        expect(workflow.isFinished()).to.be.false;

        workflow.next();
        expect(workflow.isFinished()).to.be.true;
    });


    it('should go from start to end with events', () => {
        var eventCount = 0;

        var start = new Start('start');
        var end = new End('end');


        var transition = new Transition('start to end');
        transition.inState = start;
        transition.outState = end;
        transition.emitter.on(Transition.ON_ENTER_EVENT_NAME, (args) => {
            expect(args).to.be.deep.equal(end);
            eventCount++;
        });
        transition.emitter.on(Transition.ON_EXIT_EVENT_NAME, (args) => {
            expect(args).to.be.deep.equal(start);
            eventCount++;
        });

        var workflow = createWorkflow(start, end, [transition]);

        var workflowObject = {};
        workflow.init(workflowObject);

        workflow.next();

        expect(eventCount).to.be.eq(2);
    });

    it('should go from start to state1 and stop', () => {
        var start = new Start('start');
        var end = new End('end');

        var simpleState = new SimpleState('state1');

        var transition1 = new Transition('start to end');
        transition1.inState = start;
        transition1.outState = simpleState;

        var transition2 = new Transition('start to end');
        transition2.inState = simpleState;
        transition2.outState = end;
        transition2.canTransition = state => {
            return false;
        };

        var workflow = createWorkflow(start, end, [transition1, transition2]);

        var workflowObject = {};
        workflow.init(workflowObject);

        workflow.next();
        expect(workflow.isFinished()).to.be.false;

        workflow.next();
        expect(workflow.isFinished()).to.be.false;
    });

    it('should run a parallel workflow', () => {
        var start = new Start('start');
        var end = new End('end');

        var parallelState = new ParallelState('parallel', 2);

        var simpleState1 = new SimpleState('state1');
        var simpleState2 = new SimpleState('state2');

        var transition1 = new Transition('trans 1', start, parallelState);
        var transition2 = new Transition('trans 2', parallelState, simpleState1);
        var transition3 = new Transition('trans 3', parallelState, simpleState2);
        var transition4 = new Transition('trans 4', simpleState1, end);
        var transition5 = new Transition('trans 5', simpleState2, end);

        var workflow = createWorkflow(start, end, [transition1, transition2, transition3, transition4, transition5]);

        var workflowObject = {};
        workflow.init(workflowObject);

        workflow.next();
        workflow.next();
        workflow.next();

        expect(workflow.isFinished()).to.be.true;
        expect(workflowObject[workflow.namespace].currentStates.length).to.be.equal(1);
        expect(workflowObject[workflow.namespace].handledStates.length).to.be.equal(5);
    });

    it('should run a parallel with collect workflow', () => {
        var start = new Start('start');
        var end = new End('end');

        var parallelState = new ParallelState('parallel', 2);

        var collectState = new CollectState('collect', 2);

        var transition1 = new Transition('trans 1', start, parallelState);
        var transition2 = new Transition('trans 2', parallelState, collectState);
        var transition3 = new Transition('trans 3', parallelState, collectState);
        var transition4 = new Transition('trans 4', collectState, end);


        var workflow = createWorkflow(start, end, [transition1, transition2, transition3, transition4]);

        var workflowObject = {};
        workflow.init(workflowObject);


        workflow.next();
        workflow.next();
        workflow.next();

        expect(workflow.isFinished()).to.be.true;
        expect(workflowObject[workflow.namespace].currentStates.length).to.be.equal(1);
        expect(workflowObject[workflow.namespace].handledStates.length).to.be.equal(4);
    });

    it('should import simple bpmn xml', () => {
        var workflow = new Workflow();
        var bpmnXml = fs.readFileSync('./test/bpmn_simple_test.xml')
        expect(bpmnXml).is.not.undefined;
        workflow.import(bpmnXml.toString());

        expect(workflow.transitions.length).to.be.equal(3);

        expect(workflow.transitions[0].inState.name).to.be.equal('StartEvent_1');
        expect(workflow.transitions[0].inState['isStart']).to.be.true;
        expect(workflow.transitions[0].inState['isEnd']).to.be.undefined;
        expect(workflow.transitions[0].outState.name).to.be.equal('state 1');
        expect(workflow.transitions[0].outState['isStart']).to.be.undefined;
        expect(workflow.transitions[0].outState['isEnd']).to.be.undefined;

        expect(workflow.transitions[1].inState.name).to.be.equal('state 1');
        expect(workflow.transitions[1].inState['isStart']).to.be.undefined;
        expect(workflow.transitions[1].inState['isEnd']).to.be.undefined;
        expect(workflow.transitions[1].outState.name).to.be.equal('state 2');
        expect(workflow.transitions[1].outState['isStart']).to.be.undefined;
        expect(workflow.transitions[1].outState['isEnd']).to.be.undefined;

        expect(workflow.transitions[2].inState.name).to.be.equal('state 2');
        expect(workflow.transitions[2].inState['isStart']).to.be.undefined;
        expect(workflow.transitions[2].inState['isEnd']).to.be.undefined;
        expect(workflow.transitions[2].outState.name).to.be.equal('EndEvent_1bq9q5d');
        expect(workflow.transitions[2].outState['isEnd']).to.be.true;
        expect(workflow.transitions[2].outState['isStart']).to.be.undefined;

    })
});