// SPDX-License-Identifier: MIT
// ContentAgents — ERC-8004-style mock registry for Base Sepolia (hackathon)

pragma solidity ^0.8.20;

contract AgentRegistry {
    struct AgentIdentity {
        address operator;
        string agentName;
        uint256 reputationScore; // 0-100, starts at 50
        uint256 totalDeals;
        uint256 registeredAt;
        bool exists;
    }

    mapping(address => AgentIdentity) public agents;

    event AgentRegistered(address indexed agent, address operator, string name);
    event ReputationUpdated(
        address indexed agent,
        uint256 newScore,
        uint256 totalDeals
    );

    function register(string memory agentName) external {
        require(!agents[msg.sender].exists, "Already registered");
        agents[msg.sender] = AgentIdentity(
            msg.sender,
            agentName,
            50,
            0,
            block.timestamp,
            true
        );
        emit AgentRegistered(msg.sender, msg.sender, agentName);
    }

    function updateReputation(address agent, bool dealSuccess) external {
        require(agents[agent].exists, "Agent not registered");
        if (dealSuccess) {
            agents[agent].reputationScore = _min(
                100,
                agents[agent].reputationScore + 2
            );
        } else {
            uint256 s = agents[agent].reputationScore;
            agents[agent].reputationScore = s >= 5 ? s - 5 : 0;
        }
        agents[agent].totalDeals += 1;
        emit ReputationUpdated(
            agent,
            agents[agent].reputationScore,
            agents[agent].totalDeals
        );
    }

    function getReputation(address agent)
        external
        view
        returns (uint256 score, uint256 totalDeals, bool exists)
    {
        AgentIdentity memory id = agents[agent];
        return (id.reputationScore, id.totalDeals, id.exists);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
