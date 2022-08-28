import { NearContract, NearBindgen, near, call, view, Vector } from 'near-sdk-js'
import { sha256 } from 'near-sdk-js/lib/api';

@NearBindgen 
class ZkContract extends NearContract{
  applications: Vector;

  constructor() {
    super();
  }

  default() {
    this.applications = new Vector('unique-id-vector1');
    return new ZkContract();
  }

  @view
  createTree(witness: number[]): string[] {
    var merkleTree: string[] = [];
    const size: number = witness.length;
    
    for(var i: number = 0; i<size; i++){
        merkleTree.push(sha256(witness[i] + ""));
    }
    
    for (var i: number = 0; i<size; i++) {
        merkleTree = [""].concat(merkleTree);
    }
    
    for(var i: number = size - 1; i>0; i--){
        merkleTree[i] = sha256(merkleTree[i*2] + merkleTree[i*2 + 1]);
    }
    
    return merkleTree;
  }  

  @view
  createWitness(user: number[], condition: number[]) : number[]{
    var witness: number[] = [0];

    var age: number = user[0];
    var income: number = user[1];
    var score: number = user[2];
    
    var c1: number = condition[0];
    var c2: number = condition[1];
    var c3: number = condition[2];
    
    if(age >= c1) {
        witness.push(1)
    } else{
        witness.push(0);
    } 
    
    if(income >= c2) {
        witness.push(1)
    } else{
        witness.push(0);
    } 
    
    if(score >= c3) {
        witness.push(1)
    } else{
        witness.push(0);
    } 

    //return user;
    //witness.push(0)
    
    return witness;
  }

  @view
  getProof(args: number[]): string[]{
    var proof: string[] = [];

    var user: number[] = args['args']['user'];
    var condition: number[] = args['args']['condition'];
    
    var witness: number[] = this.createWitness(user, condition);
    
    var tree: string[] = this.createTree(witness);
    
    /*var j: number;
    for(var i: number = 0; user.length; i++) {
        j = i + 1;
        proof.push(tree[j]);
        j = (i+1) * 2;
        while(true){
        proof.push(tree[j]);
        if(j*2 < tree.length) {
            j = j*2;
        }else{
            break;
        }
        }
        proof.push(tree[j+1]);
    }*/
    //return witness;
    return tree;
  }

  @view 
  verifyProofAndUpdate(args: string[]) : string[] {

    var proof: string[] = args['args']['proof'];

    var mobile: string = args['args']['mobile'];
    var name: string = args['args']['name'];

    var witness: number[] = [0, 1, 1, 1];
    
    var tree: string[] = this.createTree(witness);
    
    var status: boolean =  tree[1].normalize().substring(0,1) === proof[1].normalize().substring(0,1);

    return [name, mobile, status+""];

  }  
}
