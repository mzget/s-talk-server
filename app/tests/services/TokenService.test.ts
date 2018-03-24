import TokenService from "../../services/tokenService";

const tokenService = new TokenService();

test('test signToken with undefine', (done) => {
    tokenService.signToken(undefined, (err, result) => {
        expect(err).toBeInstanceOf(Error);
        done();
    });
});

test('test signToken with data', (done) => {
    tokenService.signToken({ username: "test", id: "1x24x" }, (err, result) => {
        expect(result).toBeDefined();
        done();
    });
});