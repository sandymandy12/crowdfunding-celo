// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Crowdfunding {

    
    uint internal projectslength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;


    struct Project {
        address payable creator;
        string name;
        string description;
        uint supporters;
        uint goal;
        uint invested;
    }
    
    // the key is the project / projectslength
    // use Project.suggestions as length for mapping
    mapping(uint => mapping(address => bool)) internal isSupporting;
    mapping(uint => mapping(address => uint)) internal investAmount;
    mapping(uint => address[]) internal supporters; // key is project index
    
    

    mapping (uint => Project) internal projects;

    event ProjectAdded(address indexed creator, string name, string description, uint goal);
    event SupportAdded(uint indexed index, address indexed supporter, uint amount);

    function addProject(
        string memory _name,
        string memory _description,
        uint _goal
    ) public {

        projects[projectslength] = Project (
            payable(msg.sender),
            _name,
            _description,
            0,
            _goal,
            0
        );
        projectslength ++;
        emit ProjectAdded(msg.sender, _name, _description, _goal);

    }

    function readProject(uint _index) public view returns (
        address _creator,
        string memory _name,
        string memory _description,
        uint _supporters,
        uint _goal,
        uint _invested
    ) {
        Project storage project = projects[_index];
    return (
        project.creator,
        project.name, 
        project.description, 
        project.supporters, 
        project.goal,
        project.invested
    );
    }
    
    function supportProject(uint _index, uint _amount) public {
        require(
            IERC20Token(cUsdTokenAddress).balanceOf(msg.sender) >= _amount,
            "Insufficient balance."
        );
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            projects[_index].creator,
            _amount
          ),
          "support did not go through."
        );
        
        if (!isSupporting[_index][msg.sender]) {
            projects[_index].supporters ++;
            isSupporting[_index][msg.sender] = true;
            supporters[_index].push(msg.sender);
            investAmount[_index][msg.sender] += _amount;
        }
        
        projects[_index].invested += _amount;

        emit SupportAdded(_index, msg.sender, _amount);
        
        
    }
    
    function getSupporters(uint _index) public view returns(address[] memory _supporters) {
        return supporters[_index];
    }
    
    function amountSupported(uint _index, address _addr) public view returns(uint _amount) {
        return investAmount[_index][_addr];
    }
    
    function totalProjects() public view returns (uint) {
        return (projectslength);
    }  
}
