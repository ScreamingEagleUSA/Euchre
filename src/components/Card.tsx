import { useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { Text } from '@react-three/drei';
import { Card as CardType, Suit } from '../game/types';

interface CardProps {
    card: CardType;
    position: [number, number, number];
    rotation: [number, number, number];
    isInteractive?: boolean;
    onClick?: () => void;
}

export function Card({ card, position, rotation, isInteractive, onClick }: CardProps) {
    const [hovered, setHover] = useState(false);

    const { pos, rot, scale } = useSpring({
        pos: [position[0], position[1] + (hovered && isInteractive ? 0.5 : 0), position[2]],
        rot: rotation,
        scale: hovered && isInteractive ? 1.1 : 1,
        config: { mass: 1, tension: 170, friction: 26 }
    });

    const handleClick = () => {
        if (isInteractive && onClick) {
            onClick();
        }
    };

    const getSuitColor = (suit: Suit) => (suit === 'H' || suit === 'D' ? '#d32f2f' : '#000000');
    const getSuitSymbol = (suit: Suit) => {
        switch (suit) {
            case 'H': return '♥';
            case 'D': return '♦';
            case 'C': return '♣';
            case 'S': return '♠';
            default: return '?';
        }
    };

    return (
        <animated.group
            position={pos as any}
            rotation={rot as any}
            scale={scale as any}
            onClick={handleClick}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {/* Card Mesh */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[1.5, 2.2, 0.02]} />
                <meshStandardMaterial color="white" />
            </mesh>

            {/* Card Back (if hidden) */}
            {card.id === 'hidden' ? (
                <mesh position={[0, 0, 0.011]}>
                    <planeGeometry args={[1.4, 2.1]} />
                    <meshStandardMaterial color="#1a237e" />
                    <Text position={[0, 0, 0.01]} fontSize={0.5} color="white" rotation={[0, 0, Math.PI / 4]}>
                        Cens
                    </Text>
                </mesh>
            ) : (
                /* Card Face */
                <group position={[0, 0, 0.011]}>
                    {/* Top Left */}
                    <Text position={[-0.5, 0.8, 0]} fontSize={0.3} color={getSuitColor(card.suit)}>
                        {card.rank}
                    </Text>
                    <Text position={[-0.5, 0.5, 0]} fontSize={0.3} color={getSuitColor(card.suit)}>
                        {getSuitSymbol(card.suit)}
                    </Text>

                    {/* Center */}
                    <Text position={[0, 0, 0]} fontSize={0.8} color={getSuitColor(card.suit)}>
                        {getSuitSymbol(card.suit)}
                    </Text>

                    {/* Bottom Right (Rotated) */}
                    <Text position={[0.5, -0.8, 0]} fontSize={0.3} color={getSuitColor(card.suit)} rotation={[0, 0, Math.PI]}>
                        {card.rank}
                    </Text>
                    <Text position={[0.5, -0.5, 0]} fontSize={0.3} color={getSuitColor(card.suit)} rotation={[0, 0, Math.PI]}>
                        {getSuitSymbol(card.suit)}
                    </Text>
                </group>
            )}
        </animated.group>
    );
}
