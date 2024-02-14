// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import OpenZeppelin's ERC20 implementation and Ownable contract
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockToken Contract
/// @notice This contract implements a mock ERC20 token.
contract MockToken is ERC20, Ownable {
    /// @notice Contract constructor
    /// @dev Initializes the ERC20 token with a name, symbol, and initial supply
    constructor() ERC20("MockToken", "MTK") Ownable(msg.sender) {
        // Mint initial supply of tokens and assign to the contract owner
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
