import { expect } from 'chai';
import {it, describe} from "mocha";
import {Workflow} from "../lib/workflow";
import {Start} from "../lib/start";
import {End} from "../lib/end";
import {Transition} from "../lib/transition";
import { SimpleState } from "../lib/simple_state";

describe('Workflow', () => {

    var createWorkflow = function(start: Start, end: End, transitions: Transition[]) {
        var workflow = new Workflow();

        workflow.namespace = 'Test';
        workflow.transitions = transitions;

        return workflow;
    }

    it('should have workflow class', () => {
        var workflow = new Workflow();
        expect(workflow).to.not.be.undefined;
    });

    it('should check init()', () => {
        var workflow = new Workflow();
        expect(() => workflow.init(null)).to.throw('namespace must not be null');

        workflow.namespace = 'Test';
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
        console.log(JSON.stringify(workflowObject));
        expect(workflow.isFinished()).to.be.true;
    })

});