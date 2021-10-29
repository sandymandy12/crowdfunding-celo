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

    modifier isSupporter (uint _index) {
        require(
            supporters[_index][msg.sender] == true,
            'must be a supporter'
        );
        _;
    }

    struct Project {
        address payable creator;
        string name;
        string description;
        uint supporters;
        uint goal;
        uint invested;
        uint suggestions;
    }
    
    struct Suggest {
        address sender;
        string comment;
        uint time;
    }
    // the key is the project / projectslength
    // use Project.suggestions as length for mapping
    mapping(uint => Suggest[]) internal suggestions;
    mapping(uint => mapping(address => bool)) internal supporters;

    mapping (uint => Project) internal projects;

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
            0,
            0
        );
        projectslength ++;
    }

    function readProject(uint _index) public view returns (
        address _creator,
        string memory _name,
        string memory _description,
        uint _supporters,
        uint _goal,
        uint _invested,
        uint _suggestions
    ) {
        return (
            projects[_index].creator,
            projects[_index].name, 
            projects[_index].description, 
            projects[_index].supporters, 
            projects[_index].goal,
            projects[_index].invested,
            projects[_index].suggestions
        );
    }
    
    function supportProject(uint _index) public payable  {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            projects[_index].creator,
            msg.value
          ),
          "support did not go through."
        );
        
        
        projects[_index].supporters ++;
        projects[_index].invested += msg.value;
        supporters[_index][msg.sender] = true;
        
    }
    
    function suggest(uint _index, string memory _comment) public isSupporter(_index) {
        Project memory p = projects[_index];
        suggestions[_index][p.suggestions] = Suggest (
              msg.sender,
              _comment,
              block.timestamp
        );
        
        p.suggestions ++;
        
    }
    
    function totalProjects() public view returns (uint) {
        return (projectslength);
    }
    
    
    function getSuggestions(uint _projIdx, uint _suggIdx) public view returns(
        address _senders,
        string memory _suggestions,
        uint _time
        ){
        Suggest memory sugg = suggestions[_projIdx][_suggIdx];
        return (sugg.sender, sugg.comment, sugg.time);
    }
}