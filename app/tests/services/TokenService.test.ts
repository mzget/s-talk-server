import TokenService from "../../services/tokenService";

const tokenService = new TokenService();

// test('test signToken undefine', () => {
//     tokenService.signToken(undefined, (err, result) => {
//         expect(err).toBeInstanceOf(Error);
//     });
// });

test('test signToken with data', () => {
    tokenService.signToken({ username: "test", id: "1x24x" }, (err, result) => {
        console.log(result);
        expect(result).toBe("");
    });
});