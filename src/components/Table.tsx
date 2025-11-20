

export function Table() {
    // Simple green felt table
    return (
        <group>
            {/* Table Surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[15, 15]} />
                <meshStandardMaterial color="#0f3e0f" roughness={0.8} />
            </mesh>

            {/* Table Border/Rim */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <boxGeometry args={[16, 16, 0.5]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
        </group>
    );
}
