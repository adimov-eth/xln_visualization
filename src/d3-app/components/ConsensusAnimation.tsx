import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ConsensusEvent, EntityNode, ConsensusType } from '../types/network.types';
import './ConsensusAnimation.css';

interface ConsensusAnimationProps {
  consensusEvent: ConsensusEvent | null;
  entityNode: EntityNode | null;
  svgGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null;
}

interface ValidatorPosition {
  address: string;
  x: number;
  y: number;
  angle: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const ConsensusAnimation: React.FC<ConsensusAnimationProps> = ({
  consensusEvent,
  entityNode,
  svgGroup
}) => {
  const animationGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const activeAnimationsRef = useRef<Set<string>>(new Set());
  const particleGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate validator positions around the entity
  const validatorPositions = useMemo(() => {
    if (!entityNode || !consensusEvent) return [];

    const positions: ValidatorPosition[] = [];
    const radius = 60;
    const angleStep = (2 * Math.PI) / consensusEvent.validators.length;

    consensusEvent.validators.forEach((address, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      positions.push({
        address,
        x: (entityNode.x || 0) + radius * Math.cos(angle),
        y: (entityNode.y || 0) + radius * Math.sin(angle),
        angle
      });
    });

    return positions;
  }, [consensusEvent, entityNode]);

  useEffect(() => {
    if (!svgGroup || !consensusEvent || !entityNode) return;

    // Create or select animation group
    let animGroup = animationGroupRef.current;
    if (!animGroup) {
      animGroup = svgGroup.append('g')
        .attr('class', 'consensus-animation-group')
        .style('pointer-events', 'none');
      animationGroupRef.current = animGroup;
      
      // Create particle group for performance
      const particleGroup = animGroup.append('g')
        .attr('class', 'particle-group');
      particleGroupRef.current = particleGroup;
    }

    // Check if this event is already animating
    if (activeAnimationsRef.current.has(consensusEvent.id)) {
      return;
    }

    activeAnimationsRef.current.add(consensusEvent.id);

    // Clear previous animations for this entity
    animGroup.selectAll(`.consensus-${entityNode.id}`).remove();

    // Create container for this entity's consensus animation
    const entityConsensusGroup = animGroup.append('g')
      .attr('class', `consensus-${entityNode.id}`)
      .attr('transform', `translate(${entityNode.x || 0},${entityNode.y || 0})`);

    if (consensusEvent.type === ConsensusType.PROPOSER_BASED) {
      animateProposerBasedConsensus(entityConsensusGroup, consensusEvent, validatorPositions);
    } else {
      animateGossipBasedConsensus(entityConsensusGroup, consensusEvent, validatorPositions);
    }

    // Remove animation after duration + cleanup time
    setTimeout(() => {
      entityConsensusGroup
        .transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
      activeAnimationsRef.current.delete(consensusEvent.id);
    }, consensusEvent.duration + 2000);

  }, [consensusEvent, entityNode, svgGroup, validatorPositions]);

  const animateProposerBasedConsensus = (
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    event: ConsensusEvent,
    validators: ValidatorPosition[]
  ) => {
    const proposerIndex = event.validators.indexOf(event.proposer || '');
    if (proposerIndex === -1) return;

    const proposerPos = validators[proposerIndex];
    const successColor = '#00ff88';
    const failColor = '#ff4444';
    const proposerColor = '#ff9900';
    const color = event.success ? successColor : failColor;

    // Create proposer highlight with enhanced glow effect
    const proposerHighlight = group.append('circle')
      .attr('class', 'consensus-proposer')
      .attr('cx', proposerPos.x)
      .attr('cy', proposerPos.y)
      .attr('r', 8)
      .attr('fill', proposerColor)
      .attr('opacity', 0)
      .style('filter', 'url(#glow)');

    proposerHighlight.transition()
      .duration(300)
      .attr('opacity', 1)
      .attr('r', 12)
      .transition()
      .duration(200)
      .attr('r', 8);
      
    // Create particle burst from proposer
    createParticleBurst(proposerPos.x, proposerPos.y, proposerColor, 20);

    // Create round indicator with enhanced styling
    const roundText = group.append('text')
      .attr('class', 'consensus-round')
      .attr('x', 0)
      .attr('y', -80)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', color)
      .attr('opacity', 0)
      .text(`Round ${event.round}`);

    roundText.transition()
      .duration(300)
      .attr('opacity', 1)
      .attr('y', -90)
      .transition()
      .delay(event.duration)
      .duration(300)
      .attr('opacity', 0);

    // Animate proposal propagation
    validators.forEach((validator, index) => {
      if (index === proposerIndex) return;

      const delay = index * 50;
      
      // Create animated particle path from proposer to validator
      const particlePath = group.append('circle')
        .attr('class', 'consensus-particle')
        .attr('cx', proposerPos.x)
        .attr('cy', proposerPos.y)
        .attr('r', 3)
        .attr('fill', proposerColor)
        .style('filter', 'url(#particleGlow)');
        
      particlePath.transition()
        .delay(delay)
        .duration(300)
        .ease(d3.easeQuadInOut)
        .attrTween('cx', () => {
          const interpolate = d3.interpolate(proposerPos.x, validator.x);
          return (t: number) => String(interpolate(t));
        })
        .attrTween('cy', () => {
          const interpolate = d3.interpolate(proposerPos.y, validator.y);
          return (t: number) => String(interpolate(t));
        })
        .on('end', () => {
          particlePath.remove();
          // Create impact effect
          createImpactRipple(validator.x, validator.y, color);
        });

      // Create validator response with signature effect
      const response = group.append('circle')
        .attr('class', 'consensus-signature')
        .attr('cx', validator.x)
        .attr('cy', validator.y)
        .attr('r', 0)
        .attr('fill', color)
        .attr('opacity', 0);

      response.transition()
        .delay(delay + 300)
        .duration(200)
        .attr('r', 6)
        .attr('opacity', 0.8)
        .on('end', () => {
          if (event.success) {
            // Add signature line to center
            const signatureLine = group.append('line')
              .attr('x1', validator.x)
              .attr('y1', validator.y)
              .attr('x2', validator.x)
              .attr('y2', validator.y)
              .attr('stroke', successColor)
              .attr('stroke-width', 1)
              .attr('opacity', 0.6)
              .attr('stroke-dasharray', '3,3');
              
            signatureLine.transition()
              .duration(500)
              .attr('x2', 0)
              .attr('y2', 0);
          }
        })
        .transition()
        .duration(event.success ? 1000 : 300)
        .attr('opacity', event.success ? 0.3 : 0);
    });

    // Show consensus result
    if (event.success) {
      const successRing = group.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 30)
        .attr('fill', 'none')
        .attr('stroke', successColor)
        .attr('stroke-width', 3)
        .attr('opacity', 0);

      successRing.transition()
        .delay(event.duration * 0.7)
        .duration(500)
        .attr('r', 70)
        .attr('opacity', 1)
        .transition()
        .duration(500)
        .attr('opacity', 0);
    }
  };

  const animateGossipBasedConsensus = (
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    event: ConsensusEvent,
    validators: ValidatorPosition[]
  ) => {
    const successColor = '#00ff88';
    const failColor = '#ff4444';
    const gossipColor = '#4488ff';
    const color = event.success ? successColor : failColor;

    // Create round indicator
    const roundText = group.append('text')
      .attr('x', 0)
      .attr('y', -80)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', color)
      .attr('opacity', 0)
      .text(`Round ${event.round}`);

    roundText.transition()
      .duration(300)
      .attr('opacity', 1);

    // Animate gossip propagation with waves
    const waves = 3;
    for (let wave = 0; wave < waves; wave++) {
      const waveDelay = wave * (event.duration / waves);
      
      // Create expanding circle for wave effect with gradient
      const waveCircle = group.append('circle')
        .attr('class', 'consensus-wave')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 30)
        .attr('fill', 'none')
        .attr('stroke', `url(#waveGradient-${wave})`)
        .attr('stroke-width', 3 - wave * 0.5)
        .attr('opacity', 0);

      waveCircle.transition()
        .delay(waveDelay)
        .duration(event.duration / waves)
        .ease(d3.easeQuadOut)
        .attr('r', 80 + wave * 10)
        .attr('opacity', 0.8 - wave * 0.2)
        .transition()
        .duration(300)
        .attr('opacity', 0)
        .remove();

      // Animate validator connections
      validators.forEach((validator, i) => {
        const nextValidator = validators[(i + 1) % validators.length];
        const delay = waveDelay + (i * 30);

        // Create curved path between validators
        const path = d3.path();
        const midX = (validator.x + nextValidator.x) / 2;
        const midY = (validator.y + nextValidator.y) / 2;
        const controlX = midX * 0.7;
        const controlY = midY * 0.7;

        path.moveTo(validator.x, validator.y);
        path.quadraticCurveTo(controlX, controlY, nextValidator.x, nextValidator.y);

        const gossipPath = group.append('path')
          .attr('d', path.toString())
          .attr('fill', 'none')
          .attr('stroke', gossipColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0);

        gossipPath.transition()
          .delay(delay)
          .duration(200)
          .attr('opacity', 0.8)
          .transition()
          .duration(300)
          .attr('opacity', 0)
          .remove();

        // Validator signatures as particles
        const particle = group.append('circle')
          .attr('cx', validator.x)
          .attr('cy', validator.y)
          .attr('r', 4)
          .attr('fill', color)
          .attr('opacity', 0);

        particle.transition()
          .delay(delay + 100)
          .duration(200)
          .attr('opacity', 1)
          .attr('r', 6)
          .transition()
          .duration(event.success ? 1000 : 300)
          .attr('opacity', event.success ? 0.3 : 0);
      });
    }

    // Show consensus result
    if (event.success) {
      const successBurst = group.append('g')
        .attr('opacity', 0);

      // Create starburst effect
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const line = successBurst.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', 0)
          .attr('y2', 0)
          .attr('stroke', successColor)
          .attr('stroke-width', 3);

        line.transition()
          .delay(event.duration * 0.8)
          .duration(400)
          .attr('x2', Math.cos(angle) * 40)
          .attr('y2', Math.sin(angle) * 40);
      }

      successBurst.transition()
        .delay(event.duration * 0.8)
        .duration(400)
        .attr('opacity', 1)
        .transition()
        .duration(400)
        .attr('opacity', 0)
        .remove();
    }
  };

  // Helper function to create particle burst effect
  const createParticleBurst = (x: number, y: number, color: string, count: number) => {
    if (!particleGroupRef.current) return;
    
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      particles.push({
        id: `particle-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 2
      });
    }
    
    animateParticles(particles);
  };
  
  // Helper function to create impact ripple
  const createImpactRipple = (x: number, y: number, color: string) => {
    if (!animationGroupRef.current) return;
    
    const ripple = animationGroupRef.current.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 5)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('opacity', 1);
      
    ripple.transition()
      .duration(400)
      .attr('r', 20)
      .attr('stroke-width', 0.5)
      .attr('opacity', 0)
      .remove();
  };
  
  // Animate particles with requestAnimationFrame for performance
  const animateParticles = (particles: Particle[]) => {
    if (!particleGroupRef.current) return;
    
    const particleElements = particleGroupRef.current
      .selectAll('.particle')
      .data(particles, (d: any) => d.id)
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('r', (d: any) => d.size)
      .attr('fill', (d: any) => d.color)
      .style('filter', 'blur(0.5px)');
      
    const updateParticles = () => {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= 0.02;
      });
      
      particleElements
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
        .attr('opacity', (d: any) => d.life);
        
      const activeParticles = particles.filter(p => p.life > 0);
      if (activeParticles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(updateParticles);
      } else {
        particleElements.remove();
      }
    };
    
    updateParticles();
  };
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Create SVG filters for effects
  useEffect(() => {
    if (!svgGroup) return;
    
    const defs = svgGroup.append('defs');
    
    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');
      
    // Particle glow filter
    const particleGlowFilter = defs.append('filter')
      .attr('id', 'particleGlow')
      .attr('width', '300%')
      .attr('height', '300%');
    particleGlowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '2');
      
    // Wave gradients
    for (let i = 0; i < 3; i++) {
      const gradient = defs.append('radialGradient')
        .attr('id', `waveGradient-${i}`);
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#4488ff')
        .attr('stop-opacity', 0.8 - i * 0.2);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#4488ff')
        .attr('stop-opacity', 0);
    }
  }, [svgGroup]);

  return null; // This component manages D3 animations directly
};