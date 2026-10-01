window.KUKAC_ACTORS={
  create({THREE,mat}){
    function addPart(parent,geo,color,pos,rot){
      const m=new THREE.Mesh(geo,mat(color,0.52,0.04));
      m.position.set(pos[0],pos[1],pos[2]);
      if(rot)m.rotation.set(rot[0],rot[1],rot[2]);
      m.castShadow=true;parent.add(m);return m;
    }
    function makeHumanoid(kind='fan',shirt=0x3a83e8){
      const g=new THREE.Group(),skin=0xf0b27a;
      addPart(g,new THREE.SphereGeometry(0.22,12,10),skin,[0,1.45,0]);
      addPart(g,new THREE.BoxGeometry(0.42,0.62,0.3),shirt,[0,1.02,0]);
      addPart(g,new THREE.BoxGeometry(0.14,0.55,0.14),0x26354a,[-0.14,0.48,0]);
      addPart(g,new THREE.BoxGeometry(0.14,0.55,0.14),0x26354a,[0.14,0.48,0]);
      const la=addPart(g,new THREE.BoxGeometry(0.12,0.52,0.12),skin,[-0.31,1.02,0]);
      const ra=addPart(g,new THREE.BoxGeometry(0.12,0.52,0.12),skin,[0.31,1.02,0]);
      g.userData.arms=[la,ra];g.userData.kind=kind;
      if(kind==='queen'){
        addPart(g,new THREE.ConeGeometry(0.42,0.62,14),0xe95cae,[0,0.88,0]);
        addPart(g,new THREE.CylinderGeometry(0.19,0.25,0.18,10),0xffd447,[0,1.75,0]);
        for(let i=0;i<5;i++)addPart(g,new THREE.ConeGeometry(0.055,0.16,6),0xffd447,[(i-2)*0.08,1.91,0]);
      }else if(kind==='soldier'){
        addPart(g,new THREE.CylinderGeometry(0.24,0.27,0.28,14),0xc7b37a,[0,1.67,0]);
        addPart(g,new THREE.BoxGeometry(0.08,0.9,0.08),0x6f4a2c,[0.38,1,0]);
      }else if(kind==='hero'){
        addPart(g,new THREE.CylinderGeometry(0.25,0.25,0.16,16),0xf04a3e,[0,1.7,0]);
        addPart(g,new THREE.BoxGeometry(0.34,0.12,0.28),0xf04a3e,[0,1.64,0.08]);
        addPart(g,new THREE.BoxGeometry(0.34,0.38,0.31),0x2d61d5,[0,0.89,0]);
      }
      g.scale.setScalar(kind==='queen'?1.05:0.9);return g;
    }
    function makeDragon(){
      const g=new THREE.Group();
      addPart(g,new THREE.SphereGeometry(0.42,16,12),0x4caf50,[0,1.05,0]);
      addPart(g,new THREE.ConeGeometry(0.38,1.1,10),0x439a46,[0,0.62,-0.42],[Math.PI/2,0,0]);
      const head=addPart(g,new THREE.SphereGeometry(0.31,14,10),0x58bf55,[0,1.16,0.48]);
      addPart(g,new THREE.ConeGeometry(0.09,0.35,8),0xf0e0a0,[-0.18,1.42,0.53]);
      addPart(g,new THREE.ConeGeometry(0.09,0.35,8),0xf0e0a0,[0.18,1.42,0.53]);
      const wingGeo=new THREE.ConeGeometry(0.42,0.9,3);
      const wl=addPart(g,wingGeo,0x2f7f43,[-0.48,1.05,-0.05],[0,0,-1.15]);
      const wr=addPart(g,wingGeo,0x2f7f43,[0.48,1.05,-0.05],[0,0,1.15]);
      g.userData.wings=[wl,wr];g.userData.head=head;g.userData.kind='dragon';g.scale.setScalar(1.15);return g;
    }
    return{makeHumanoid,makeDragon};
  }
};
